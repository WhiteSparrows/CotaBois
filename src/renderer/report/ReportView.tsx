import { computeCutList } from '../../core/cutList'
import { projectBounds } from '../../core/geometry'
import type { Project } from '../../core/model'
import { formatMm, formatSquareMeters } from '../../core/units'
import type { ReportContent } from '../store'
import './report.css'

const NO_MATERIAL = '—'

/** La vue imprimée en PDF : invisible à l'écran, seule visible à l'impression. */
export function ReportView({ project, content }: { project: Project; content: ReportContent }) {
  const { lines, totals } = computeCutList(project)
  const bounds = projectBounds(project)

  return (
    <article className="report" data-testid="report">
      <header className="report-header">
        <h1>{project.name}</h1>
        <p>{content.date}</p>
      </header>

      {bounds && (
        <p className="report-size">
          Dimensions d'ensemble :{' '}
          <strong>
            {formatMm(bounds.size.x)} × {formatMm(bounds.size.y)} × {formatMm(bounds.size.z)} mm
          </strong>
        </p>
      )}

      {content.imageUrl && <img className="report-image" src={content.imageUrl} alt="Vue du meuble" />}

      <h2>Liste de découpe</h2>
      <table className="report-table">
        <thead>
          <tr>
            <th scope="col" className="number">Quantité</th>
            <th scope="col">Pièces</th>
            <th scope="col" className="number">Longueur (mm)</th>
            <th scope="col" className="number">Largeur (mm)</th>
            <th scope="col" className="number">Épaisseur (mm)</th>
            <th scope="col">Matériau</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.pieceIds[0]}>
              <td className="number strong">{line.quantity}</td>
              <td>{line.names.join(', ')}</td>
              <td className="number">{formatMm(line.length)}</td>
              <td className="number">{formatMm(line.width)}</td>
              <td className="number">{formatMm(line.thickness)}</td>
              <td>{line.material || NO_MATERIAL}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="report-note">Cotes finies, en millimètres.</p>

      <h2>Totaux</h2>
      <table className="report-table report-totals">
        <thead>
          <tr>
            <th scope="col">Matériau</th>
            <th scope="col" className="number">Épaisseur (mm)</th>
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
    </article>
  )
}
