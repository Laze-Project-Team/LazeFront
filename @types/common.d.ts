interface loginResult {
	success: boolean;
	userData: userData;
}

interface userData {
	id: string;
	username: string;
	avatar: string;
}

interface contentObject {
	path: string;
	content: string;
}

interface loadedProject {
	dir: dirObject;
	contents: contentObject[];
}

interface dirObject {
	type: 'file' | 'folder';
	name: string;
	value?: dirObject[];
}

interface saveResult {
	value: string;
	style: 'info' | 'err';
}

interface compileData {
	filename: string;
	value: string;
}

interface saveData {
	projectName: string;
	filename: string;
	value: string;
}

interface loginData {
	accountName: string;
}

interface loadProjectData {
	projectName: string;
}

interface createProjectData {
	projectName: string;
}

interface loadFileData {
	fileName: string;
}
