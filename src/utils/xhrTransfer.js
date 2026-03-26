/**
 * XMLHttpRequest helpers so we can report upload/download progress (fetch has limited support).
 */

export function getBlobWithProgress(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
        return;
      }
      const blob = xhr.response;
      blob
        .text()
        .then((text) => {
          try {
            const j = JSON.parse(text);
            reject(new Error(j.error || text || `Request failed (${xhr.status})`));
          } catch {
            reject(new Error(text || `Request failed (${xhr.status})`));
          }
        })
        .catch(() => reject(new Error(`Request failed (${xhr.status})`)));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.send();
  });
}

export function postFormDataJsonWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.onload = () => {
      let data = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.error || xhr.responseText || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.send(formData);
  });
}
