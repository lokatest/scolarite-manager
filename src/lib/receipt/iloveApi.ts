const API_BASE = "https://api.ilovepdf.com/v1";

export interface StartedTask {
  server: string;
  task: string;
}

interface UploadResponse {
  server_filename: string;
}

async function getAuthToken(): Promise<string> {
  const publicKey = process.env.ILOVEAPI_PUBLIC_KEY?.trim();
  if (!publicKey) {
    throw new Error("Identifiant iLoveAPI manquant : définissez ILOVEAPI_PUBLIC_KEY.");
  }

  const res = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: publicKey }),
  });

  if (!res.ok) {
    throw new Error(`Échec d'authentification iLoveAPI (${res.status}) : ${await res.text()}`);
  }

  const data = await res.json();
  return data.token as string;
}

/**
 * Démarre une tâche de conversion et envoie le fichier. Retourne
 * l'identifiant de tâche (server + task) à persister immédiatement en
 * base : si le traitement est interrompu ensuite (ex : délai serveur
 * dépassé), une tentative ultérieure peut vérifier l'état de CETTE même
 * tâche avant d'en démarrer une nouvelle, évitant de payer deux fois.
 */
export async function startAndUpload(docxBytes: Uint8Array): Promise<StartedTask> {
  const token = await getAuthToken();

  const startRes = await fetch(`${API_BASE}/start/officepdf`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!startRes.ok) {
    throw new Error(`Échec du démarrage de la tâche iLoveAPI (${startRes.status})`);
  }
  const { server, task } = await startRes.json();

  const formData = new FormData();
  formData.append("task", task);
  formData.append(
    "file",
    new Blob([docxBytes as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    "document.docx"
  );

  const uploadRes = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!uploadRes.ok) {
    throw new Error(
      `Échec de l'envoi du fichier à iLoveAPI (${uploadRes.status}) : ${await uploadRes.text()}`
    );
  }
  const { server_filename }: UploadResponse = await uploadRes.json();

  const processRes = await fetch(`https://${server}/v1/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      task,
      tool: "officepdf",
      files: [{ server_filename, filename: "document.docx" }],
    }),
  });
  if (!processRes.ok) {
    throw new Error(
      `Échec de la conversion iLoveAPI (${processRes.status}) : ${await processRes.text()}`
    );
  }

  return { server, task };
}

/**
 * Télécharge le résultat d'une tâche déjà démarrée. Peut être appelé
 * juste après startAndUpload, ou plus tard pour reprendre une tâche
 * dont on n'a pas pu récupérer le résultat lors de la tentative précédente.
 */
export async function downloadResult(startedTask: StartedTask): Promise<Uint8Array> {
  const token = await getAuthToken();

  const res = await fetch(`https://${startedTask.server}/v1/download/${startedTask.task}`, {
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
 * Convertit un fichier Word (.docx) en PDF en une seule fois (démarrage +
 * téléchargement). Pour un usage avec reprise possible en cas d'échec
 * partiel, préférer startAndUpload puis downloadResult séparément.
 */
export async function convertDocxToPdfViaILoveApi(docxBytes: Uint8Array): Promise<Uint8Array> {
  const started = await startAndUpload(docxBytes);
  return downloadResult(started);
}
