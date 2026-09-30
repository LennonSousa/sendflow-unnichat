import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type FirestoreError,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export type Connection = { id: string; name: string };
export type Contact = {
  id: string;
  connectionId: string;
  name: string;
  phone: string;
};
export type BroadcastStatus = "scheduled" | "sent";
export type BroadcastMessage = {
  id: string;
  connectionId: string;
  body: string;
  contactIds: string[];
  status: BroadcastStatus;
  scheduledAt: Timestamp | null;
  createdAt: Timestamp | null;
};

function getDatabase() {
  if (!db) throw new Error("O Firestore não está configurado.");
  return db;
}

function getFunctions() {
  if (!functions) throw new Error("O Firebase Functions não está configurado.");
  return functions;
}

export function listenToConnections(
  tenantId: string,
  onUpdate: (connections: Connection[]) => void,
  onError: (error: FirestoreError) => void,
) {
  const connectionQuery = query(
    collection(getDatabase(), "connections"),
    where("tenantId", "==", tenantId),
    orderBy("name"),
  );

  return onSnapshot(
    connectionQuery,
    (snapshot) => {
      onUpdate(
        snapshot.docs.map((item) => ({
          id: item.id,
          name: item.data().name as string,
        })),
      );
    },
    onError,
  );
}

export function listenToContacts(
  tenantId: string,
  connectionId: string,
  onUpdate: (contacts: Contact[]) => void,
  onError: (error: FirestoreError) => void,
) {
  const contactQuery = query(
    collection(getDatabase(), "contacts"),
    where("tenantId", "==", tenantId),
    where("connectionId", "==", connectionId),
    orderBy("name"),
  );

  return onSnapshot(
    contactQuery,
    (snapshot) => {
      onUpdate(
        snapshot.docs.map((item) => ({
          id: item.id,
          connectionId: item.data().connectionId as string,
          name: item.data().name as string,
          phone: item.data().phone as string,
        })),
      );
    },
    onError,
  );
}

export function listenToMessages(
  tenantId: string,
  connectionId: string,
  onUpdate: (messages: BroadcastMessage[]) => void,
  onError: (error: FirestoreError) => void,
) {
  const messageQuery = query(
    collection(getDatabase(), "messages"),
    where("tenantId", "==", tenantId),
    where("connectionId", "==", connectionId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    messageQuery,
    (snapshot) => {
      onUpdate(
        snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            connectionId: data.connectionId as string,
            body: data.body as string,
            contactIds: data.contactIds as string[],
            status: data.status as BroadcastStatus,
            scheduledAt: data.scheduledAt as Timestamp | null,
            createdAt: data.createdAt as Timestamp | null,
          };
        }),
      );
    },
    onError,
  );
}

export function createConnection(tenantId: string, name: string) {
  return addDoc(collection(getDatabase(), "connections"), {
    tenantId,
    name: name.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateConnection(connectionId: string, name: string) {
  return updateDoc(doc(getDatabase(), "connections", connectionId), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteConnection(connectionId: string) {
  const removeConnection = httpsCallable<
    { connectionId: string },
    { deleted: boolean }
  >(getFunctions(), "deleteConnection");
  await removeConnection({ connectionId });
}

export function createContact(
  tenantId: string,
  connectionId: string,
  name: string,
  phone: string,
) {
  return addDoc(collection(getDatabase(), "contacts"), {
    tenantId,
    connectionId,
    name: name.trim(),
    phone: phone.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateContact(contactId: string, name: string, phone: string) {
  return updateDoc(doc(getDatabase(), "contacts", contactId), {
    name: name.trim(),
    phone: phone.trim(),
    updatedAt: serverTimestamp(),
  });
}

export function deleteContact(contactId: string) {
  return deleteDoc(doc(getDatabase(), "contacts", contactId));
}

export async function createBroadcast(input: {
  connectionId: string;
  contactIds: string[];
  body: string;
  scheduledAt?: string;
}) {
  const saveMessage = httpsCallable<
    typeof input,
    { messageId: string; status: BroadcastStatus }
  >(getFunctions(), "createBroadcast");

  return (await saveMessage(input)).data;
}

export async function updateBroadcast(input: {
  messageId: string;
  body: string;
  contactIds: string[];
  scheduledAt?: string;
}) {
  const updateMessage = httpsCallable<typeof input, { updated: boolean }>(
    getFunctions(),
    "updateBroadcast",
  );

  return (await updateMessage(input)).data;
}

export async function deleteBroadcast(messageId: string) {
  const removeMessage = httpsCallable<
    { messageId: string },
    { deleted: boolean }
  >(getFunctions(), "deleteBroadcast");

  return (await removeMessage({ messageId })).data;
}
