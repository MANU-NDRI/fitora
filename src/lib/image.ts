export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function filesToDataUrls(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files);
  return Promise.all(list.map(fileToDataUrl));
}
