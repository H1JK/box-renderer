export const sha256hex = async (data: string) => {
    const bytes = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}