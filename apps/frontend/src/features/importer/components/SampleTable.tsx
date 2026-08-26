import type { IImporterUploadResponse } from '../types/importer.types';

export function SampleTable({ preview }: { preview: IImporterUploadResponse }) {
  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="sample-title"
    >
      <div className="border-b border-border px-5 py-4">
        <h2 id="sample-title" className="font-semibold">
          Muestra del archivo
        </h2>
        <p className="text-xs text-muted-foreground">
          Vista estructural de las primeras {preview.sampleRows.length} filas. Todavía no se
          interpretan las columnas.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-medium">Fila</th>
              {preview.headers.map((header, index) => (
                <th key={`${header}-${index}`} className="whitespace-nowrap px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {preview.sampleRows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-3 py-2 font-mono text-muted-foreground">{row.rowNumber}</td>
                {row.cells.map((cell, index) => (
                  <td key={index} className="max-w-xs whitespace-nowrap px-3 py-2">
                    {cell === null ? (
                      <span aria-label="vacío" className="text-muted-foreground">
                        —
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
