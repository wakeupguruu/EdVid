"use client";

import { useState } from "react";

export default function MergePage() {
	const [filesText, setFilesText] = useState("");
	const [transition, setTransition] = useState("fade");
	const [transitionDuration, setTransitionDuration] = useState(0.5);
	const [isMerging, setIsMerging] = useState(false);
	const [resultUrl, setResultUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleMerge() {
		setIsMerging(true);
		setError(null);
		setResultUrl(null);
		try {
			const files = filesText
				.split(/\r?\n/)
				.map((s) => s.trim())
				.filter(Boolean);
			const res = await fetch("/api/output", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ files, transition, transitionDuration }),
			});
			const json = await res.json();
			if (!res.ok) {
				throw new Error(json.error || "Failed to merge");
			}
			setResultUrl(json.url);
		} catch (e: any) {
			setError(String(e.message || e));
		} finally {
			setIsMerging(false);
		}
	}

	return (
		<div className="max-w-3xl mx-auto p-6 space-y-4">
			<h1 className="text-xl font-semibold">Merge Videos</h1>
			<p className="text-sm text-gray-600">
				Enter one file path per line. Paths can be absolute or relative to the app root. To
				use the Manim samples in this repo layout, prefix with ../, e.g.
				<code className="ml-1">../Manim/media/videos/video/480p15/AlgebraicProof.mp4</code>.
			</p>
			<textarea
				className="w-full h-40 border rounded p-2 font-mono text-sm"
				placeholder={"../Manim/media/videos/video/480p15/AlgebraicProof.mp4\n../Manim/media/videos/video/480p15/AncientMystery.mp4"}
				value={filesText}
				onChange={(e) => setFilesText(e.target.value)}
			/>

			<div className="flex items-center gap-4">
				<label className="flex items-center gap-2">
					<span>Transition</span>
					<select
						className="border rounded p-1"
						value={transition}
						onChange={(e) => setTransition(e.target.value)}
					>
						<option value="fade">fade</option>
						<option value="wipeleft">wipeleft</option>
						<option value="slideright">slideright</option>
						<option value="smoothleft">smoothleft</option>
					</select>
				</label>
				<label className="flex items-center gap-2">
					<span>Duration (s)</span>
					<input
						type="number"
						min={0.1}
						step={0.1}
						className="border rounded p-1 w-24"
						value={transitionDuration}
						onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
					/>
				</label>
				<button
					onClick={handleMerge}
					disabled={isMerging}
					className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
				>
					{isMerging ? "Merging..." : "Merge"}
				</button>
			</div>

			{error && <div className="text-red-600 text-sm">{error}</div>}
			{resultUrl && (
				<div className="space-y-2">
					<p className="text-sm">Merged video:</p>
					<video src={resultUrl} controls className="w-full rounded border" />
					<p className="text-xs text-gray-600">URL: {resultUrl}</p>
				</div>
			)}
		</div>
	);
}


