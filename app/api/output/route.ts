import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { PrismaClient } from "@/db/generated/prisma";
import { uploadFileToDrive } from "@/lib/googleDrive";
import { getServerSession } from "next-auth";
import { Next_Auth, ExtendedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional: allow configuring ffmpeg/ffprobe paths via env (useful on Windows)
if (process.env.FFMPEG_PATH) {
	ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
	ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

type MergeRequestBody = {
	files?: string[]; // Absolute or project-relative paths to .mp4 files, in desired order
	directory?: string; // Directory to scan for .mp4 files (non-recursive)
	transition?: string; // e.g., "fade", "slideleft", etc. (per ffmpeg xfade)
	transitionDuration?: number; // seconds, default 0.5
	outputName?: string; // optional custom output filename (without directories)
	videoId?: string; // optional: link to existing Video row
	promptId?: string; // optional: or resolve by promptId
	uploadToDrive?: boolean; // default true
	driveFolderId?: string; // override env folder id
	sharePublic?: boolean; // override env share flag
};

function resolveToAbsolute(filePath: string): string {
	if (path.isAbsolute(filePath)) return filePath;
	// Resolve relative to the Next.js app root (this file lives under edvid/)
	return path.resolve(process.cwd(), filePath);
}

function ensureDirSync(dirPath: string) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

function ffprobeDuration(filePath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(filePath, (err, data) => {
			if (err) return reject(err);
			const duration = data.format?.duration ?? 0;
			resolve(typeof duration === "number" ? duration : Number(duration || 0));
		});
	});
}

function listMp4Recursive(dir: string): string[] {
	const results: string[] = [];
	if (!fs.existsSync(dir)) return results;
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...listMp4Recursive(full));
		} else if (entry.isFile() && full.toLowerCase().endsWith(".mp4")) {
			results.push(full);
		}
	}
	return results;
}

function listMp4InDirectory(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp4"))
        .map((e) => path.join(dir, e.name));
}

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(Next_Auth);
		const user = session?.user as ExtendedUser | undefined;
		if (!user?.id) {
			return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
		}

		const body = (await req.json()) as MergeRequestBody;
		const transition = body.transition ?? "fade";
		const transitionDuration = body.transitionDuration ?? 0.5;
		let inputFiles = (body.files ?? []).map(resolveToAbsolute);

		// If no files provided, auto-discover from Manim output directory
		if (!inputFiles.length) {
			if (body.directory) {
				const dirPath = resolveToAbsolute(body.directory);
				inputFiles = listMp4InDirectory(dirPath);
			} else {
				const baseDir = path.resolve(process.cwd(), "Manim", "media", "videos", "video");
				inputFiles = listMp4Recursive(baseDir);
			}
			// Sort for stable ordering
			inputFiles.sort();
		}

		if (!inputFiles.length) {
			return NextResponse.json(
				{ error: "No input files provided. Send { files: string[] } in desired order." },
				{ status: 400 }
			);
		}

		// Validate files exist
		for (const file of inputFiles) {
			if (!fs.existsSync(file)) {
				return NextResponse.json({ error: `File not found: ${file}` }, { status: 400 });
			}
		}

		// Probe durations to build xfade chain
		const durations = await Promise.all(inputFiles.map(ffprobeDuration));

		// Prepare output path under public/merged so it can be served statically
		const publicDir = path.resolve(process.cwd(), "public");
		const mergedDir = path.resolve(publicDir, "merged");
		ensureDirSync(mergedDir);
		const baseName = (body.outputName && body.outputName.trim()) || `merged-${Date.now()}.mp4`;
		const outputPath = path.resolve(mergedDir, baseName);
		const publicUrl = `/merged/${baseName}`;

		// Create DB linkage if needed before work begins (so we can log "started")
		let linkedVideoId: string | undefined = body.videoId;
		let relatedPromptId: string | undefined = body.promptId;
		if (!relatedPromptId) {
			// Create a prompt representing this manual merge
			const prompt = await prisma.prompt.create({
				data: {
					inputText: body.directory ? `Manual merge from ${body.directory}` : `Manual merge of ${inputFiles.length} files`,
					userId: user.id,
					status: "pending",
				},
			});
			relatedPromptId = prompt.id;
			await prisma.activityLog.create({
				data: {
					userId: user.id,
					promptId: prompt.id,
					action: "merge_started",
					metadata: { files: inputFiles },
				},
			});
		}

		if (!linkedVideoId) {
			const video = await prisma.video.create({
				data: {
					promptId: relatedPromptId!,
					status: "processing",
					title: `Merged Video (${inputFiles.length} parts)`,
				},
			});
			linkedVideoId = video.id;
		}

		await prisma.prompt.update({
			where: { id: relatedPromptId! },
			data: { status: "processing", startedProcessingAt: new Date() },
		});
		await prisma.videoProcessingLog.create({
			data: {
				videoId: linkedVideoId!,
				stage: "merge",
				message: `Preparing to merge ${inputFiles.length} files`,
				level: "info",
				metadata: { files: inputFiles },
			},
		});

		// If only one file, just copy to output and continue with upload/DB updates
		if (inputFiles.length === 1) {
			fs.copyFileSync(inputFiles[0], outputPath);
		}

		// Build filter_complex for xfade chain
		// We'll chain: [0:v][1:v] xfade=... [v01]; [v01][2:v] xfade=... [v02]; ...
		let complexFilters: string[] = [];
		let previousLabel = "0:v";
		let cumulativeDuration = durations[0];
		for (let i = 1; i < inputFiles.length; i++) {
			const offset = Math.max(0, (cumulativeDuration - transitionDuration));
			const outLabel = `vout${i}`;
			const lhs = previousLabel.startsWith("[") ? previousLabel : `[${previousLabel}]`;
			const rhs = `[${i}:v]`;
			complexFilters.push(
				`${lhs}${rhs}xfade=transition=${transition}:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outLabel}]`
			);
			previousLabel = outLabel;
			cumulativeDuration = cumulativeDuration + (durations[i] || 0) - transitionDuration;
		}

		if (inputFiles.length > 1) {
			await new Promise<void>((resolve, reject) => {
				const cmd = ffmpeg();
				inputFiles.forEach((f) => cmd.input(f));
				cmd
					.complexFilter(complexFilters.join(";"))
					.outputOptions([
						"-map",
						`[${previousLabel}]`,
						"-an",
						"-c:v",
						"libx264",
						"-preset",
						"veryfast",
						"-crf",
						"18",
						"-pix_fmt",
						"yuv420p",
						"-movflags",
						"+faststart",
					])
					.on("error", (err) => reject(err))
					.on("end", () => resolve())
					.save(outputPath);
			});
		}

		// Determine resolution label
		const probe = await new Promise<any>((resolve, reject) => {
			ffmpeg.ffprobe(outputPath, (err, data) => (err ? reject(err) : resolve(data)));
		});
		let height = 0;
		if (probe?.streams) {
			const vstream = probe.streams.find((s: any) => s.codec_type === "video");
			height = vstream?.height || 0;
		}
		let resolutionLabel = "";
		if (height >= 1000) resolutionLabel = "1080p";
		else if (height >= 700) resolutionLabel = "720p";
		else if (height >= 450) resolutionLabel = "480p";
		else resolutionLabel = `${height}p`;

		// Upload to Google Drive if requested
		const shouldUpload = body.uploadToDrive !== false; // default true
		let driveInfo: { fileId?: string; webViewLink?: string; webContentLink?: string } = {};
		if (shouldUpload) {
			const folderId = body.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
			const sharePublic = body.sharePublic?.toString() ?? process.env.GOOGLE_DRIVE_SHARE_PUBLIC;
			if (sharePublic != null) {
				process.env.GOOGLE_DRIVE_SHARE_PUBLIC = String(sharePublic);
			}
			const uploaded = await uploadFileToDrive(outputPath, baseName, folderId);
			driveInfo = {
				fileId: uploaded.fileId,
				webViewLink: uploaded.webViewLink,
				webContentLink: uploaded.webContentLink,
			};
		}

		// Database updates
		if (linkedVideoId) {
			// Mark processing start (if not already)
			await prisma.video.update({
				where: { id: linkedVideoId },
				data: {
					status: "processing",
					processingStartedAt: new Date(),
				},
			});
			await prisma.videoProcessingLog.create({
				data: {
					videoId: linkedVideoId,
					stage: "merge",
					message: `Merging ${inputFiles.length} files with transition ${transition}`,
					level: "info",
					metadata: { files: inputFiles, outputPath },
				},
			});

			const finalUrl = driveInfo.webContentLink || driveInfo.webViewLink || publicUrl;
			const updatedVideo = await prisma.video.update({
				where: { id: linkedVideoId },
				data: {
					status: "completed",
					videoUrl: finalUrl,
					processingCompletedAt: new Date(),
					title: `Merged Video (${inputFiles.length} parts)`,
					duration: Math.round((probe?.format?.duration ?? 0) as number),
				},
			});
			await prisma.videoProcessingLog.create({
				data: {
					videoId: linkedVideoId,
					stage: "upload",
					message: shouldUpload ? "Uploaded to Google Drive" : "Saved locally",
					level: "info",
					metadata: { driveInfo },
				},
			});

			// Upsert format entry
			await prisma.videoFormat.create({
				data: {
					videoId: linkedVideoId,
					resolution: resolutionLabel,
					url: finalUrl,
				},
			});

			// Update related prompt as completed and add activity log
			if (!relatedPromptId) {
				const video = await prisma.video.findUnique({ where: { id: linkedVideoId } });
				relatedPromptId = video?.promptId;
			}
			if (relatedPromptId) {
				const prompt = await prisma.prompt.update({
					where: { id: relatedPromptId },
					data: {
						status: "completed",
						completedAt: new Date(),
					},
				});
				await prisma.activityLog.create({
					data: {
						userId: prompt.userId,
						promptId: prompt.id,
						action: "merged_and_uploaded",
						metadata: { videoId: linkedVideoId, driveInfo, localUrl: publicUrl },
					},
				});
			}
		}

		return NextResponse.json({
			localUrl: publicUrl,
			merged: inputFiles.length,
			approxDuration: cumulativeDuration,
			resolution: resolutionLabel,
			drive: driveInfo,
			videoId: linkedVideoId,
			promptId: relatedPromptId,
		});
	} catch (err: any) {
		console.error("/api/output error", err);
		return NextResponse.json({ error: "Failed to merge videos", details: String(err?.message || err) }, { status: 500 });
	}
}
