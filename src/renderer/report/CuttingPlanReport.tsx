import { computeCost } from '../../core/cost'
import { computeLayout, formatUsage, groupLabel } from '../../core/layout'
import type { Project } from '../../core/model'
import { formatEuros, formatMm } from '../../core/units'
import {
  capitalize,
  costLabel,
  costMissing,
  costQuantity,
  costTotal,
  costUnitPrice,
  edgeMeters,
  groupTitle,
  hasAnyPrice,
  NO_MINIMUM_GUARANTEE,
  panelTitle,
  stockSize,
  unplacedText
} from '../layoutText'
import { LayoutDrawing } from '../panels/LayoutDrawing'
import type { ReportContent } from '../store'
import './report.css'

const NO_MATERIAL = '—'

/** Le plan de coupe imprimé : invisible à l'écran, seul visible à l'impression. */
export function CuttingPlanReport({ project, content }: { project: Project; content: ReportContent }) {
  const layout = computeLayout(project)
  const { kerf, edgeMargin } = project.layout
  const cost = computeCost(project, layout)
  const missing = costMissing(cost)

  return (
    <article className="report cutting-plan" data-testid="cutting-plan">
      <header className="report-header">
        <h1>{project.name} · plan de coupe</h1>
        <p>{content.date}</p>
      </header>

      <h2>À acheter</h2>
      <table className="report-table report-buy">
        <thead>
          <tr>
            <th scope="col">Matériau</th>
            <th scope="col" className="number">Épaisseur (mm)</th>
            <th scope="col" className="number">Quantité</th>
            <th scope="col" className="number">Panneau (mm)</th>
            <th scope="col" className="number">Utilisation</th>
            <th scope="col">Sens du fil</th>
          </tr>
        </thead>
        <tbody>
          {layout.groups.map((group) => (
            <tr key={`${group.thickness}|${group.material}`}>
              <td>{group.material || NO_MATERIAL}</td>
              <td className="number">{formatMm(group.thickness)}</td>
              <td className="number strong">{group.panelCount}</td>
              <td className="number">{stockSize(group)}</td>
              <td className="number">{formatUsage(group.usedArea, group.panelArea)}</td>
              <td>{group.stock.grain ? 'Respecté' : 'Libre'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {layout.groups.some((group) => group.edgeCount > 0) && (
        <>
          <h2>Chant à acheter</h2>
          <table className="report-table report-buy">
            <thead>
              <tr>
                <th scope="col">Matériau du panneau</th>
                <th scope="col" className="number">Épaisseur (mm)</th>
                <th scope="col" className="number">Chant (mm)</th>
                <th scope="col" className="number">Métrage</th>
              </tr>
            </thead>
            <tbody>
              {layout.groups
                .filter((group) => group.edgeCount > 0)
                .map((group) => (
                  <tr key={`${group.thickness}|${group.material}`}>
                    <td>{group.material || NO_MATERIAL}</td>
                    <td className="number">{formatMm(group.thickness)}</td>
                    <td className="number">{formatMm(group.stock.edgeThickness)}</td>
                    <td className="number strong">{edgeMeters(group)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {hasAnyPrice(project.layout.panels) && (
        <section className="report-cost">
          <h2>Coût du meuble</h2>
          <table className="report-table">
            <tbody>
              {cost.items.map((item) => (
                <tr key={`${item.kind}|${item.thickness}|${item.material}`}>
                  <td>{capitalize(costLabel(item))}</td>
                  <td className="number">{costQuantity(item)}</td>
                  <td className="number">{costUnitPrice(item)}</td>
                  <td className="number strong">{item.amount === null ? '—' : formatEuros(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="report-cost-total">{costTotal(cost)}</p>
          {missing && <p className="report-note">{missing}</p>}
        </section>
      )}

      <p className="report-settings">
        Trait de scie : {formatMm(kerf)} mm · Marge de bord : {formatMm(edgeMargin)} mm
        {layout.groups.some((group) => group.edgeCount > 0) && <> · Surlongueur de chant : {formatMm(project.layout.edgeOverhang)} mm</>}
      </p>
      <p className="report-note">
        {NO_MINIMUM_GUARANTEE} Cotes à couper, en millimètres : la cote finie moins l'épaisseur des chants. Le trait de scie
        n'est pas dessiné : il correspond à l'écart entre les pièces.
      </p>

      {!layout.complete && (
        <section className="report-warning">
          <h2>Résultat incomplet : pièces non placées</h2>
          <ul>
            {layout.groups.flatMap((group) =>
              group.unplaced.map((piece) => (
                <li key={piece.pieceId}>
                  {unplacedText(piece)} ({groupLabel(group.material, group.thickness)})
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {layout.groups.map((group) => {
        let first = 1
        return (
          <section key={`${group.thickness}|${group.material}`} className="cutting-group">
            <h2 className="report-plans-title">Panneaux {groupLabel(group.material, group.thickness)}</h2>
            {group.panels.length === 0 && (
              <p>Aucun panneau : aucune pièce de ce groupe ne tient sur le panneau choisi. Voir les pièces non placées.</p>
            )}
            {group.panels.map((panel, index) => {
              const title = panelTitle(first, panel.quantity, group.panelCount)
              first += panel.quantity
              return (
                <section key={index} className="cutting-panel">
                  <h3>{title}</h3>
                  <LayoutDrawing
                    panel={panel}
                    length={group.stock.length}
                    width={group.stock.width}
                    margin={edgeMargin}
                    label={`${groupTitle(group)}, ${title}`}
                    tableClassName="report-table"
                    foldCuts={false}
                  />
                </section>
              )
            })}
          </section>
        )
      })}
    </article>
  )
}
