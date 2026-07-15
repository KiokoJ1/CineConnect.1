import AsyncStorage from '@react-native-async-storage/async-storage';

const IDENTITY_KEY_STORAGE = 'cc_identity_key';
const CONVERSATION_KEY_STORAGE = 'cc_conversation_key:';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.max(0, Math.ceil(hex.length / 2)));
  for (let i = 0; i < bytes.length; i += 1) {
    const pair = hex.slice(i * 2, i * 2 + 2);
    if (pair) bytes[i] = Number.parseInt(pair, 16);
  }
  return bytes;
}

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decodeText(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

function toBufferSource(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

async function getOrCreateIdentityKey(): Promise<CryptoKey> {
  const stored = await AsyncStorage.getItem(IDENTITY_KEY_STORAGE);
  if (stored) {
    const keyData = fromHex(stored);
    return crypto.subtle.importKey('raw', toBufferSource(keyData), 'HKDF', false, ['deriveKey']);
  }

  const keyMaterial = crypto.getRandomValues(new Uint8Array(32));
  await AsyncStorage.setItem(IDENTITY_KEY_STORAGE, toHex(keyMaterial));
  return crypto.subtle.importKey('raw', toBufferSource(keyMaterial), 'HKDF', false, ['deriveKey']);
}

async function deriveConversationKey(participantId: string, remotePublicKey?: string): Promise<string> {
  const existing = await AsyncStorage.getItem(`${CONVERSATION_KEY_STORAGE}${participantId}`);
  if (existing && !remotePublicKey) {
    return existing;
  }

  const identityKey = await getOrCreateIdentityKey();
  const baseKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toBufferSource(encodeText(`cineconnect-${participantId}`)),
      info: toBufferSource(encodeText('conversation-key')),
    },
    identityKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  const exported = new Uint8Array(await crypto.subtle.exportKey('raw', baseKey));
  const keyHex = toHex(exported);
  await AsyncStorage.setItem(`${CONVERSATION_KEY_STORAGE}${participantId}`, keyHex);
  return keyHex;
}

async function getConversationKey(participantId: string): Promise<string | null> {
  return AsyncStorage.getItem(`${CONVERSATION_KEY_STORAGE}${participantId}`);
}

async function setConversationKey(participantId: string, keyHex: string): Promise<void> {
  await AsyncStorage.setItem(`${CONVERSATION_KEY_STORAGE}${participantId}`, keyHex);
}

async function getEncryptionKey(participantId: string): Promise<CryptoKey> {
  const keyHex = (await getConversationKey(participantId)) ?? (await deriveConversationKey(participantId));
  return crypto.subtle.importKey('raw', toBufferSource(fromHex(keyHex)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptText(text: string, participantId: string): Promise<string> {
  const key = await getEncryptionKey(participantId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, toBufferSource(encodeText(text)));
  return `${toHex(iv)}:${toHex(new Uint8Array(cipher))}`;
}

export async function decryptText(cipherText: string, participantId: string): Promise<string> {
  if (!cipherText || !cipherText.includes(':')) return cipherText;
  const [ivHex, dataHex] = cipherText.split(':');
  const key = await getEncryptionKey(participantId);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBufferSource(fromHex(ivHex)) },
    key,
    toBufferSource(fromHex(dataHex)),
  );
  return decodeText(new Uint8Array(plain));
}

export async function setConversationKeyForParticipant(participantId: string, keyHex: string): Promise<void> {
  await setConversationKey(participantId, keyHex);
}

export async function ensureConversationKey(participantId: string): Promise<string> {
  return deriveConversationKey(participantId);
}
