const API_BASE = "https://api.ilovepdf.com/v1";

interface StartTaskResponse {
  server: string;
  task: string;
}

interface UploadResponse {
  server_filename: string;
}

async function getAuthToken(publicKey: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: publicKey }),
  });

  if (!res.ok) {
    throw new Error(
      `Échec d'authentification iLoveAPI (${res.status}) : ${await res.text()}`
    );
  }

  const data = await res.json();
  return data.token as string;
}

async function startTask(token: string): Promise<StartTaskResponse> {
  const res = await fetch(`${API_BASE}/start/officepdf`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Échec du démarrage de la tâche iLoveAPI (${res.status})`);
  }

  return res.json();
}

async function uploadFile(
  token: string,
  server: string,
  task: string,
  docxBytes: Uint8Array
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("task", task);
  formData.append(
    "file",
    new Blob([docxBytes as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    "document.docx"
  );

  const res = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Échec de l'envoi du fichier à iLoveAPI (${res.status}) : ${await res.text()}`);
  }

  return res.json();
}

async function processTask(
  token: string,
  server: string,
  task: string,
  serverFilename: string
): Promise<void> {
  const res = await fetch(`https://${server}/v1/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task,
      tool: "officepdf",
      files: [{ server_filename: serverFilename, filename: "document.docx" }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Échec de la conversion iLoveAPI (${res.status}) : ${await res.text()}`);
  }
}

async function downloadResult(token: string, server: string, task: string): Promise<Uint8Array> {
  const res = await fetch(`https://${server}/v1/download/${task}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Échec du téléchargement du résultat iLoveAPI (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Convertit un fichier Word (.docx) en PDF via l'API iLoveAPI
 * (https://www.iloveapi.com). Nécessite la variable d'environnement
 * ILOVEAPI_PUBLIC_KEY.
 */
export async function convertDocxToPdfViaILoveApi(docxBytes: Uint8Array): Promise<Uint8Array> {
  const publicKey = process.env.ILOVEAPI_PUBLIC_KEY?.trim();

  if (!publicKey) {
    throw new Error("Identifiant iLoveAPI manquant : définissez ILOVEAPI_PUBLIC_KEY.");
  }

  const token = await getAuthToken(publicKey);
  const { server, task } = await startTask(token);
  const { server_filename } = await uploadFile(token, server, task, docxBytes);
  await processTask(token, server, task, server_filename);
  return downloadResult(token, server, task);
}
