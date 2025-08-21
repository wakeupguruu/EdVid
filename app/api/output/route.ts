import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


type MergeRequestBody = {
	directory?: string; // Directory to scan for .mp4 files (non-recursive)
	transition?: string; // e.g., "fade", "slideleft", etc. (per ffmpeg xfade)
	transitionDuration?: number; // seconds, default 0.5
	outputName?: string; // optional custom output filename (without directories)
};

function resolveToAbsolute(filePath: string): string {
	if (path.isAbsolute(filePath)) return filePath;
	return path.resolve(process.cwd(), filePath);
}

function resolveDirectoryCandidate(dirPath: string): string {
    if (path.isAbsolute(dirPath)) return dirPath;
    const candidateInCwd = path.resolve(process.cwd(), dirPath);
    if (fs.existsSync(candidateInCwd)) return candidateInCwd;
    const candidateInParent = path.resolve(process.cwd(), "..", dirPath);
    if (fs.existsSync(candidateInParent)) return candidateInParent;
    return candidateInCwd; // default fallback
}

function ensureDirSync(dirPath: string) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

function listMp4InDirectory(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	return entries
		.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp4"))
		.map((e) => path.join(dir, e.name))
		.sort();
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

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as MergeRequestBody;
		const transition = body.transition ?? "fade";
		const transitionDuration = body.transitionDuration ?? 0.5;

		// Determine source directory
		let sourceDir = body.directory?.trim();
		if (!sourceDir) {
			// Default relative folder; will be resolved against cwd and parent
			const defaultRelative = path.join("Manim", "media", "videos", "video", "480p15");
			sourceDir = resolveDirectoryCandidate(defaultRelative);
		} else {
			sourceDir = resolveDirectoryCandidate(sourceDir);
		}

		let inputFiles = listMp4InDirectory(sourceDir);
		// De-duplicate any accidental duplicates
		inputFiles = Array.from(new Set(inputFiles));
		if (!inputFiles.length) {
			return NextResponse.json({ error: `No .mp4 files found in: ${sourceDir}` }, { status: 400 });
		}

		// Prepare output path under public/merged so it can be served statically
		const publicDir = path.resolve(process.cwd(), "public");
		const mergedDir = path.resolve(publicDir, "merged");
		ensureDirSync(mergedDir);
		const baseName = (body.outputName && body.outputName.trim()) || `merged-${Date.now()}.mp4`;
		const outputPath = path.resolve(mergedDir, baseName);
		const publicUrl = `/merged/${baseName}`;

		// Fast path: single file, just copy
		if (inputFiles.length === 1) {
			fs.copyFileSync(inputFiles[0], outputPath);
			return NextResponse.json({ url: publicUrl, files: inputFiles });
		}

		// Probe durations to build xfade chain
		const durations = await Promise.all(inputFiles.map(ffprobeDuration));

		let complexFilters: string[] = [];
		let previousLabel = "0:v";
		let cumulativeDuration = durations[0];
		for (let i = 1; i < inputFiles.length; i++) {
			const offset = Math.max(0, cumulativeDuration - transitionDuration);
			const outLabel = `vout${i}`;
			const lhs = previousLabel.startsWith("[") ? previousLabel : `[${previousLabel}]`;
			const rhs = `[${i}:v]`;
			complexFilters.push(
				`${lhs}${rhs}xfade=transition=${transition}:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outLabel}]`
			);
			previousLabel = outLabel;
			cumulativeDuration = cumulativeDuration + (durations[i] || 0) - transitionDuration;
		}

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

		return NextResponse.json({ url: publicUrl, files: inputFiles });
	} catch (err: any) {
		console.error("/api/output error", err);
		return NextResponse.json({ error: "Failed to merge videos", details: String(err?.message || err) }, { status: 500 });
	}
}


