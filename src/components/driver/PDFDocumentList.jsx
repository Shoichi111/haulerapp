// PDFDocumentList — renders inline photos and tappable PDF cards below the briefing text.
// Opens PDFs in a new tab so audio keeps playing uninterrupted.
// Renders nothing when no attachments exist.

export default function PDFDocumentList({ pdfUrls, photoUrls }) {
  const hasPhotos = Array.isArray(photoUrls) && photoUrls.length > 0
  const hasPdfs = Array.isArray(pdfUrls) && pdfUrls.length > 0

  // Nothing to show — render nothing
  if (!hasPhotos && !hasPdfs) return null

  return (
    <div className="mt-6 space-y-6">
      {/* Site photos — inline grid */}
      {hasPhotos && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Site Photos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {photoUrls.map((photo, i) => (
              <a
                key={photo.url ?? i}
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl border border-gray-200"
              >
                <img
                  src={photo.url}
                  alt={photo.name || `Site photo ${i + 1}`}
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
                {photo.name && (
                  <p className="px-3 py-2 text-xs text-gray-500 truncate bg-white">
                    {photo.name}
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* PDF document cards */}
      {hasPdfs && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Documents
          </h3>
          <div className="space-y-3">
            {pdfUrls.map((pdf, i) => (
              <a
                key={pdf.url ?? i}
                href={pdf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 active:bg-gray-50 transition-colors"
              >
                {/* PDF icon */}
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>

                {/* Document name */}
                <span className="flex-1 min-w-0 text-sm font-medium text-gray-700 truncate">
                  {pdf.name || `Document ${i + 1}`}
                </span>

                {/* Chevron right */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
