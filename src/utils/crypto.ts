import CryptoJS from "crypto-js";

const RAW_KEY = "8080808080808080";
const KEY = CryptoJS.enc.Utf8.parse(RAW_KEY);
const IV = CryptoJS.enc.Utf8.parse(RAW_KEY);


export function encryptAES(plainText: string): string {
  const encrypted = CryptoJS.AES.encrypt(plainText, KEY, {
    mode: CryptoJS.mode.CBC,
    iv: IV,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}


export function decryptAES(cipherText: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(cipherText, KEY, {
      mode: CryptoJS.mode.CBC,
      iv: IV,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}