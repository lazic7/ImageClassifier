import { useMemo, useRef, useState } from "react";

export function UploadCard() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileSelected(f) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Molim odaberi sliku (jpg/png/webp...).");
      return;
    }
    setFile(f);
  }

  function onChange(e) {
    const f = e.target.files?.[0];
    onFileSelected(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    onFileSelected(f);
  }

  function onDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function clear() {
    setFile(null);
    setResult("");
    setError("");
    setLoading(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function predict() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult("");

    try {
      const form = new FormData();
      form.append("image", file);

      const resp = await fetch("http://localhost:8080/api/predict", {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }

      const text = await resp.text(); // backend vraća plain string
      setResult(text.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Upload image</h2>
          <p className="text-sm text-gray-600 mt-1">
            Odaberi sliku ili je povuci u okvir. Kasnije ćemo je poslati na
            backend za predikciju.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onChange}
          />

          <div
            onClick={pickFile}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            role="button"
            tabIndex={0}
            className={[
              "mt-5 rounded-xl border-2 border-dashed p-6 cursor-pointer select-none transition",
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:bg-gray-50",
            ].join(" ")}
          >
            {!file ? (
              <div className="text-center">
                <div className="text-sm font-medium text-gray-800">
                  Klikni za odabir slike
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ili povuci i pusti (JPG, PNG, WEBP)
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-[220px_1fr] items-start">
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-900 break-all">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB • {file.type || "image"}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clear();
                      }}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      disabled={!file || loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        predict();
                      }}
                      className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Predicting..." : "Predict"}
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 mt-3">
                    Tip: klikni “Clear” pa odaberi novu sliku.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            Backend endpoint će kasnije vratiti predikciju (npr.{" "}
            <span className="font-semibold">cat</span>).
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500">Prediction</div>
          <div className="text-lg font-semibold text-gray-900">{result}</div>
        </div>
      )}
    </div>
  );
}
