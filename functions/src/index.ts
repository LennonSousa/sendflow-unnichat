import { initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

const db = getFirestore();

type CreateBroadcastInput = {
  connectionId?: unknown;
  contactIds?: unknown;
  body?: unknown;
  scheduledAt?: unknown;
};

type UpdateBroadcastInput = {
  messageId?: unknown;
  body?: unknown;
  contactIds?: unknown;
  scheduledAt?: unknown;
};

async function validateBroadcastContent(
  tenantId: string,
  connectionId: string,
  body: unknown,
  contactIds: unknown,
) {
  if (
    typeof body !== "string" ||
    body.trim().length === 0 ||
    body.length > 4000
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Informe uma mensagem de até 4.000 caracteres.",
    );
  }

  if (
    !Array.isArray(contactIds) ||
    contactIds.length === 0 ||
    contactIds.some((id) => typeof id !== "string" || id.length === 0)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Selecione ao menos um contato válido.",
    );
  }

  const uniqueContactIds = [...new Set(contactIds as string[])];
  if (uniqueContactIds.length > 100) {
    throw new HttpsError(
      "invalid-argument",
      "Selecione no máximo 100 contatos por mensagem.",
    );
  }

  const contactSnapshots = await db.getAll(
    ...uniqueContactIds.map((id) => db.collection("contacts").doc(id)),
  );
  if (
    contactSnapshots.some(
      (contact) =>
        !contact.exists ||
        contact.data()?.tenantId !== tenantId ||
        contact.data()?.connectionId !== connectionId,
    )
  ) {
    throw new HttpsError(
      "not-found",
      "Um ou mais contatos não pertencem a essa conexão.",
    );
  }

  return { body: body.trim(), contactIds: uniqueContactIds };
}

function requireUserId(uid: string | undefined) {
  if (!uid)
    throw new HttpsError("unauthenticated", "Faça login para continuar.");
  return uid;
}

async function deleteQueryInBatches(query: FirebaseFirestore.Query) {
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();

    if (snapshot.size < 400) return;
  }
}

export const createBroadcast = onCall(async (request) => {
  const tenantId = requireUserId(request.auth?.uid);
  const { connectionId, contactIds, body, scheduledAt } =
    request.data as CreateBroadcastInput;

  if (typeof connectionId !== "string" || connectionId.trim().length === 0) {
    throw new HttpsError("invalid-argument", "A conexão é obrigatória.");
  }
  let scheduleDate: Date | null = null;
  if (scheduledAt !== undefined && scheduledAt !== null) {
    if (typeof scheduledAt !== "string") {
      throw new HttpsError("invalid-argument", "A data agendada é inválida.");
    }
    scheduleDate = new Date(scheduledAt);
    if (
      Number.isNaN(scheduleDate.getTime()) ||
      scheduleDate.getTime() <= Date.now()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A data agendada deve estar no futuro.",
      );
    }
  }

  const connectionRef = db.collection("connections").doc(connectionId);
  const connectionSnapshot = await connectionRef.get();
  if (
    !connectionSnapshot.exists ||
    connectionSnapshot.data()?.tenantId !== tenantId
  ) {
    throw new HttpsError("not-found", "A conexão não foi encontrada.");
  }

  const validated = await validateBroadcastContent(
    tenantId,
    connectionId,
    body,
    contactIds,
  );

  const messageRef = db.collection("messages").doc();
  const status = scheduleDate ? "scheduled" : "sent";
  await messageRef.set({
    tenantId,
    connectionId,
    body: validated.body,
    contactIds: validated.contactIds,
    status,
    scheduledAt: scheduleDate ? Timestamp.fromDate(scheduleDate) : null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { messageId: messageRef.id, status };
});

export const updateBroadcast = onCall(async (request) => {
  const tenantId = requireUserId(request.auth?.uid);
  const { messageId, body, contactIds, scheduledAt } =
    request.data as UpdateBroadcastInput;

  if (typeof messageId !== "string" || messageId.trim().length === 0) {
    throw new HttpsError("invalid-argument", "A mensagem é inválida.");
  }

  const messageRef = db.collection("messages").doc(messageId);
  const messageSnapshot = await messageRef.get();
  const message = messageSnapshot.data();
  if (!messageSnapshot.exists || message?.tenantId !== tenantId) {
    throw new HttpsError("not-found", "A mensagem não foi encontrada.");
  }

  const validated = await validateBroadcastContent(
    tenantId,
    message.connectionId as string,
    body,
    contactIds,
  );

  const updates: Record<string, unknown> = {
    body: validated.body,
    contactIds: validated.contactIds,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (message.status === "scheduled" && scheduledAt !== undefined) {
    if (typeof scheduledAt !== "string") {
      throw new HttpsError("invalid-argument", "A data agendada é inválida.");
    }

    const newScheduledDate = new Date(scheduledAt);
    if (
      Number.isNaN(newScheduledDate.getTime()) ||
      newScheduledDate.getTime() <= Date.now()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A data agendada deve estar no futuro.",
      );
    }

    updates.scheduledAt = Timestamp.fromDate(newScheduledDate);
  } else if (scheduledAt !== undefined) {
    throw new HttpsError(
      "failed-precondition",
      "Somente mensagens agendadas podem ter o horário alterado.",
    );
  }

  await messageRef.update(updates);

  return { updated: true };
});

export const deleteBroadcast = onCall(async (request) => {
  const tenantId = requireUserId(request.auth?.uid);
  const { messageId } = request.data as { messageId?: unknown };

  if (typeof messageId !== "string" || messageId.trim().length === 0) {
    throw new HttpsError("invalid-argument", "A mensagem é inválida.");
  }

  const messageRef = db.collection("messages").doc(messageId);
  const messageSnapshot = await messageRef.get();
  if (
    !messageSnapshot.exists ||
    messageSnapshot.data()?.tenantId !== tenantId
  ) {
    throw new HttpsError("not-found", "A mensagem não foi encontrada.");
  }

  await messageRef.delete();
  return { deleted: true };
});

export const sendScheduledBroadcasts = onSchedule(
  { schedule: "every 1 minutes", timeZone: "UTC", maxInstances: 1 },
  async () => {
    const dueMessages = await db
      .collection("messages")
      .where("status", "==", "scheduled")
      .where("scheduledAt", "<=", Timestamp.now())
      .limit(400)
      .get();

    await Promise.all(
      dueMessages.docs.map((messageDocument) =>
        db.runTransaction(async (transaction) => {
          const currentSnapshot = await transaction.get(messageDocument.ref);
          const current = currentSnapshot.data();
          if (
            !currentSnapshot.exists ||
            current?.status !== "scheduled" ||
            !(current.scheduledAt instanceof Timestamp) ||
            current.scheduledAt.toMillis() > Date.now()
          ) {
            return;
          }

          transaction.update(messageDocument.ref, {
            status: "sent",
            sentAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }),
      ),
    );
  },
);

export const deleteConnection = onCall(async (request) => {
  const tenantId = requireUserId(request.auth?.uid);
  const { connectionId } = request.data as { connectionId?: unknown };

  if (typeof connectionId !== "string" || connectionId.trim().length === 0) {
    throw new HttpsError("invalid-argument", "A conexão é inválida.");
  }

  const connectionRef = db.collection("connections").doc(connectionId);
  const connectionSnapshot = await connectionRef.get();
  if (
    !connectionSnapshot.exists ||
    connectionSnapshot.data()?.tenantId !== tenantId
  ) {
    throw new HttpsError("not-found", "A conexão não foi encontrada.");
  }

  await deleteQueryInBatches(
    db
      .collection("contacts")
      .where("tenantId", "==", tenantId)
      .where("connectionId", "==", connectionId),
  );
  await deleteQueryInBatches(
    db
      .collection("messages")
      .where("tenantId", "==", tenantId)
      .where("connectionId", "==", connectionId),
  );
  await connectionRef.delete();

  return { deleted: true };
});
