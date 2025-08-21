import { google } from "googleapis";
import fs from "fs";
import path from "path";

export type DriveUploadResult = {
	fileId: string;
	webViewLink?: string;
	webContentLink?: string;
};

function getServiceAccountAuth() {
	const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
	const saKey = process.env.GOOGLE_PRIVATE_KEY;
	const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS_FILE;

	if (credsJson) {
		const creds = JSON.parse(credsJson);
		return new google.auth.JWT({
			email: creds.client_email,
			key: (creds.private_key as string).replace(/\\n/g, "\n"),
			scopes: ["https://www.googleapis.com/auth/drive.file"],
		});
	}

	if (credsFile) {
		const fullPath = path.isAbsolute(credsFile) ? credsFile : path.resolve(process.cwd(), credsFile);
		if (!fs.existsSync(fullPath)) {
			throw new Error(`GOOGLE_APPLICATION_CREDENTIALS_FILE not found at: ${fullPath}`);
		}
		const content = fs.readFileSync(fullPath, "utf8");
		const creds = JSON.parse(content);
		return new google.auth.JWT({
			email: creds.client_email,
			key: (creds.private_key as string).replace(/\\n/g, "\n"),
			scopes: ["https://www.googleapis.com/auth/drive.file"],
		});
	}

	if (!saEmail || !saKey) {
		throw new Error("Missing Google Drive credentials. Set one of: GOOGLE_APPLICATION_CREDENTIALS_JSON, GOOGLE_APPLICATION_CREDENTIALS_FILE, or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY.");
	}

	return new google.auth.JWT({
		email: saEmail,
		key: saKey.replace(/\\n/g, "\n"),
		scopes: ["https://www.googleapis.com/auth/drive.file"],
	});
}


export async function uploadFileToDrive(
	localFilePath: string,
	fileName: string,
	folderId?: string
): Promise<DriveUploadResult> {
	const auth = getServiceAccountAuth();
	const drive = google.drive({ version: "v3", auth });

	const fileMetadata: any = { name: fileName };
	if (folderId) {
		fileMetadata.parents = [folderId];
	}

	const media = {
		mimeType: "video/mp4",
		body: fs.createReadStream(localFilePath),
	};

	const { data } = await drive.files.create({
		requestBody: fileMetadata,
		media,
		fields: "id, webViewLink, webContentLink",
		supportsAllDrives: true,
	});

	if (process.env.GOOGLE_DRIVE_SHARE_PUBLIC === "true" && data.id) {
		await drive.permissions.create({
			fileId: data.id,
			requestBody: { role: "reader", type: "anyone" },
			supportsAllDrives: true,
		});
		const permRes = await drive.files.get({
			fileId: data.id,
			fields: "id, webViewLink, webContentLink",
			supportsAllDrives: true,
		});
		return {
			fileId: data.id,
			webViewLink: permRes.data.webViewLink || undefined,
			webContentLink: permRes.data.webContentLink || undefined,
		};
	}

	return { fileId: data.id!, webViewLink: data.webViewLink || undefined, webContentLink: data.webContentLink || undefined };
}


