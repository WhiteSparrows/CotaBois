import { useMemo } from 'react'
import { computeCutList } from '../../core/cutList'
import { projectBounds } from '../../core/geometry'
import { formatMm, formatSquareMeters } from '../../core/units'
import { exportCsv, exportPdf, selectPieces, useEditor } from '../store'

const NO_MATERIAL = '—'

export function CutListPanel() {
  const { project, selection } = useEditor()
  const { lines, totals } = useMemo(() => computeCutList(project), [project])
  const bounds = useMemo(() => projectBounds(project), [project])
  const isEmpty = lines.length === 0

  return (
    <section className="panel cut-panel" aria-label="Liste de découpe">
      <h2>Liste de découpe</h2>
      <div className="button-row export-actions">
        <button type="button" className="secondary" disabled={isEmpty} onClick={() => void exportPdf()}>
          Exporter en PDF
        </button>
        <button type="button" className="secondary" disabled={isEmpty} onClick={() => void exportCsv()}>
          Exporter en CSV
        </button>
      </div>
      {bounds && (
        <p className="overall-size">
          Dimensions d'ensemble :{' '}
          <strong data-testid="overall-size">
            {formatMm(bounds.size.x)} × {formatMm(bounds.size.y)} × {formatMm(bounds.size.z)} mm
          </strong>
        </p>
      )}

      {isEmpty ? (
        <>
          <p className="empty-note">Aucune pièce pour l'instant.</p>
          <p className="empty-note">Ajoutez une pièce pour pouvoir exporter la liste.</p>
        </>
      ) : (
        <>
          <table className="data-table" data-testid="cut-list">
            <thead>
              <tr>
                <th scope="col" className="number">Qté</th>
                <th scope="col">Pièces</th>
                <th scope="col" className="number">Long.</th>
                <th scope="col" className="number">Larg.</th>
                <th scope="col" className="number">Ép.</th>
                <th scope="col">Matériau</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const isSelected = line.pieceIds.some((id) => selection.includes(id))
                return (
                  <tr
                    key={line.pieceIds[0]}
                    className="selectable"
                    data-selected={isSelected}
                    onClick={() => selectPieces(line.pieceIds)}
                  >
                    <td className="number strong">{line.quantity}</td>
                    <td>
                      <button type="button" className="row-button" aria-pressed={isSelected}>
                        {line.names.join(', ')}
                      </button>
                      {line.plan !== null && <span className="plan-badge">Plan {line.plan}</span>}
                    </td>
                    <td className="number">{formatMm(line.length)}</td>
                    <td className="number">{formatMm(line.width)}</td>
                    <td className="number">{formatMm(line.thickness)}</td>
                    <td>{line.material || NO_MATERIAL}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="table-note">Cotes finies, en millimètres.</p>

          <h3>Totaux</h3>
          <table className="data-table" data-testid="cut-totals">
            <thead>
              <tr>
                <th scope="col">Matériau</th>
                <th scope="col" className="number">Ép.</th>
                <th scope="col" className="number">Pièces</th>
                <th scope="col" className="number">Surface</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((total) => (
                <tr key={`${total.material}|${total.thickness}`}>
                  <td>{total.material || NO_MATERIAL}</td>
                  <td className="number">{formatMm(total.thickness)}</td>
                  <td className="number">{total.pieceCount}</td>
                  <td className="number">{formatSquareMeters(total.area)} m²</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
