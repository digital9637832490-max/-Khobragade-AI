import crypto from 'crypto';
export function privateStorageKey(userId:string, originalName:string){
  const ext = originalName.includes('.') ? '.' + originalName.split('.').pop()!.replace(/[^a-z0-9]/gi,'') : '';
  return `users/${userId}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}${ext}`;
}
// Replace this local placeholder with an S3-compatible SDK.
// Keep objects private and return short-lived signed URLs from authenticated API endpoints only.
