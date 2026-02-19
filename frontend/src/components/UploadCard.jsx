import { useEffect, useRef, useState } from "react";

function formatPercent(value) {
  if (typeof value !== "number") return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function getBestLabel(scoreMap) {
  const entries = Object.entries(scoreMap);
  if (!entries.length) return { label: "-", score: 0 };

  const [label, score] = entries.sort((a, b) => b[1] - a[1])[0];
  return { label, score };
}

function buildBatchSummary(predictions) {
  const speciesScores = {};
  const speciesCounts = {};

  predictions.forEach((prediction) => {
    const label = prediction.species || "unknown";
    const conf = prediction.species_conf ?? 0;
    speciesScores[label] = (speciesScores[label] || 0) + conf;
    speciesCounts[label] = (speciesCounts[label] || 0) + 1;
  });

  const bestSpecies = getBestLabel(speciesScores);
  const finalSpecies = bestSpecies.label;

  const breedScores = {};
  const breedCounts = {};

  predictions
    .filter((prediction) => (prediction.species || "unknown") === finalSpecies)
    .forEach((prediction) => {
      const label = prediction.breed || "-";
      const conf = prediction.breed_conf ?? 0;
      breedScores[label] = (breedScores[label] || 0) + conf;
      breedCounts[label] = (breedCounts[label] || 0) + 1;
    });

  const bestBreed = getBestLabel(breedScores);

  return {
    finalSpecies,
    finalSpeciesVotes: speciesCounts[finalSpecies] || 0,
    finalBreed: bestBreed.label,
    finalBreedVotes: breedCounts[bestBreed.label] || 0,
    totalBreedCandidates: predictions.filter(
      (prediction) => (prediction.species || "unknown") === finalSpecies,
    ).length,
    speciesScores,
    breedScores,
  };
}

function BatchSummary({ predictions }) {
  const summary = buildBatchSummary(predictions);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-xs uppercase tracking-wide text-emerald-700">
        Konačni rezultat seta slika
      </div>
      <div className="mt-2 grid md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-white border border-emerald-100 p-3">
          <div className="text-xs text-gray-500">Konačna životinja</div>
          <div className="text-lg font-semibold text-gray-900">
            {summary.finalSpecies}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Glasovi: {summary.finalSpeciesVotes}/{predictions.length}
          </div>
          <div className="text-sm text-gray-600">
            Prosek conf:{" "}
            {formatPercent(
              (summary.speciesScores[summary.finalSpecies] || 0) /
                (summary.finalSpeciesVotes || 1),
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white border border-emerald-100 p-3">
          <div className="text-xs text-gray-500">Konačna pasmina</div>
          <div className="text-lg font-semibold text-gray-900">
            {summary.finalBreed}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Glasovi: {summary.finalBreedVotes}/{summary.totalBreedCandidates}
          </div>
          <div className="text-sm text-gray-600">
            Prosek conf:{" "}
            {formatPercent(
              (summary.breedScores[summary.finalBreed] || 0) /
                (summary.finalBreedVotes || 1),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

export function UploadCard() {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function pickFile() {
    inputRef.current?.click();
  }

  function onFilesSelected(fileList) {
    if (!fileList?.length) return;

    const selected = Array.from(fileList);
    const invalid = selected.find((f) => !f.type.startsWith("image/"));

    if (invalid) {
      alert("Molim odaberi samo slike (jpg/png/webp...).");
      return;
    }

    setFiles(selected);
  }

  function onChange(e) {
    onFilesSelected(e.target.files);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    onFilesSelected(e.dataTransfer.files);
  }

  function onDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function clear() {
    setFiles([]);
    setResult(null);
    setError("");
    setLoading(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function predict() {
    if (!files.length) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const form = new FormData();
      files.forEach((file) => {
        form.append("images", file);
      });

      const resp = await fetch(`${API_BASE_URL}/api/predict`, {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data);
    } catch (e) {
      setError(e.message || "Došlo je do greške.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Upload images</h2>
          <p className="text-sm text-gray-600 mt-1">
            Odaberi više slika ili ih povuci u okvir. Sve slike šaljemo na
            backend za predikciju.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
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
            {!files.length ? (
              <div className="text-center">
                <div className="text-sm font-medium text-gray-800">
                  Klikni za odabir slika
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ili povuci i pusti (JPG, PNG, WEBP)
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Odabrano slika: {files.length}
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                    >
                      <img
                        src={previewUrls[index]}
                        alt={file.name}
                        className="w-full h-28 object-cover"
                      />
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  ))}
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
                    disabled={!files.length || loading}
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
                  Tip: klikni “Clear” pa odaberi novi set slika.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            Backend endpoint vraća predikcije za prosleđeni niz slika.
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              ok: {String(result.ok)}
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              count: {result.count ?? 0}
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              timing: {result.timing_ms ?? "-"} ms
            </span>
          </div>

          {!!result.predictions?.length && (
            <div className="space-y-4">
              <BatchSummary predictions={result.predictions} />

              {result.predictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm text-gray-500">
                      Image #{prediction.id}
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {prediction.species || "unknown"}
                    </div>
                    <div className="text-sm text-gray-600">
                      species conf: {formatPercent(prediction.species_conf)}
                    </div>
                    <div className="text-sm text-gray-600">
                      breed: {prediction.breed || "-"}
                    </div>
                    <div className="text-sm text-gray-600">
                      breed conf: {formatPercent(prediction.breed_conf)}
                    </div>
                  </div>

                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                        Top species
                      </div>
                      <div className="space-y-2">
                        {prediction.topk_species?.map((item, idx) => (
                          <div
                            key={`${prediction.id}-species-${item.label}-${idx}`}
                            className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"
                          >
                            <span className="text-sm text-gray-800">
                              {item.label}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatPercent(item.conf)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                        Top breed
                      </div>
                      <div className="space-y-2">
                        {prediction.topk_breed?.map((item, idx) => (
                          <div
                            key={`${prediction.id}-breed-${item.label}-${idx}`}
                            className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"
                          >
                            <span className="text-sm text-gray-800">
                              {item.label}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatPercent(item.conf)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!!result.errors?.length && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-medium text-amber-800">
                Backend errors
              </div>
              <ul className="mt-1 text-sm text-amber-700 list-disc pl-5 space-y-1">
                {result.errors.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
