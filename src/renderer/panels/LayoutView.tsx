import { useMemo, useState } from 'react'
import { computeCost, type Cost } from '../../core/cost'
import { computeLayout, groupLabel, type LayoutGroup } from '../../core/layout'
import type { CoreError, Result } from '../../core/result'
import { formatEuros, formatMm, parseEuros, parseMm } from '../../core/units'
import {
  capitalize,
  costLabel,
  costMissing,
  costQuantity,
  costTotal,
  costUnitPrice,
  groupSummary,
  groupTitle,
  hasAnyPrice,
  NO_MINIMUM_GUARANTEE,
  panelTitle,
  priceField,
  unplacedText
} from '../layoutText'
import { changeLayoutOptions, changePanelStock, exportCuttingPlan, useEditor } from '../store'
import { CommitField } from './CommitField'
import { LayoutDrawing } from './LayoutDrawing'

function failure(result: Result<unknown>): CoreError | null {
  return result.ok ? null : result.error
}

function GroupView({ group, margin }: { group: LayoutGroup; margin: number }) {
  const summary = groupSummary(group)
  const [grainError, setGrainError] = useState<CoreError | null>(null)

  function commitStock(field: 'length' | 'width' | 'edgeThickness') {
    return (text: string): CoreError | null => {
      const parsed = parseMm(text)
      return parsed.ok ? failure(changePanelStock(group.material, group.thickness, { [field]: parsed.value })) : parsed.error
    }
  }

  function commitPrice(field: 'panelPrice' | 'edgePrice') {
    return (text: string): CoreError | null => {
      if (text.trim() === '') return failure(changePanelStock(group.material, group.thickness, { [field]: null }))
      const parsed = parseEuros(text)
      return parsed.ok ? failure(changePanelStock(group.material, group.thickness, { [field]: parsed.value })) : parsed.error
    }
  }

  let first = 1
  return (
    <section className="layout-group" aria-label={`Panneaux ${groupLabel(group.material, group.thickness)}`}>
      <h3>{groupTitle(group)}</h3>
      <div className="layout-fields">
        <CommitField label="Longueur du panneau" unit="mm" value={formatMm(group.stock.length)} onCommit={commitStock('length')} />
        <CommitField label="Largeur du panneau" unit="mm" value={formatMm(group.stock.width)} onCommit={commitStock('width')} />
      </div>
      <div className="layout-fields">
        <CommitField
          label="Épaisseur du chant"
          unit="mm"
          value={formatMm(group.stock.edgeThickness)}
          onCommit={commitStock('edgeThickness')}
        />
      </div>
      <div className="layout-fields">
        <CommitField label="Prix du panneau" unit="€" value={priceField(group.stock.panelPrice)} onCommit={commitPrice('panelPrice')} />
        <CommitField label="Prix du chant" unit="€/m" value={priceField(group.stock.edgePrice)} onCommit={commitPrice('edgePrice')} />
      </div>
      {group.edgeCount > 0 && group.stock.edgeThickness === 0 && (
        <p className="panel-note">
          L'épaisseur du chant est nulle : les cotes à couper sont les cotes finies. Renseignez-la pour qu'elle en soit retirée.
        </p>
      )}
      <label className="check-field">
        <input
          type="checkbox"
          checked={group.stock.grain}
          onChange={(event) => setGrainError(failure(changePanelStock(group.material, group.thickness, { grain: event.target.checked })))}
        />
        Respecter le sens du fil
      </label>
      {grainError && (
        <p className="field-error" role="alert">
          {grainError.message}
        </p>
      )}
      {group.stock.isDefault && (
        <p className="panel-note">Panneau proposé par défaut : remplacez ses cotes par celles de votre fournisseur.</p>
      )}

      <p className="layout-summary" data-testid="layout-summary">
        <strong>{summary.panels}</strong> · {summary.usage} · {summary.pieces}
        {summary.edges && <> · {summary.edges}</>}
      </p>

      {group.unplaced.length > 0 && (
        <div className="layout-warning" role="alert" data-testid="layout-warning">
          <strong>Résultat incomplet</strong>
          <ul>
            {group.unplaced.map((piece) => (
              <li key={piece.pieceId}>{unplacedText(piece)}</li>
            ))}
          </ul>
        </div>
      )}

      {group.panels.map((panel, index) => {
        const title = panelTitle(first, panel.quantity, group.panelCount)
        first += panel.quantity
        return (
          <figure key={index} className="layout-panel" data-testid="layout-panel" data-quantity={panel.quantity}>
            <figcaption>{title}</figcaption>
            <LayoutDrawing
              panel={panel}
              length={group.stock.length}
              width={group.stock.width}
              margin={margin}
              label={`${groupTitle(group)}, ${title}`}
              tableClassName="data-table"
              foldCuts
            />
          </figure>
        )
      })}
    </section>
  )
}

/** Chaque achat, puis le total, jamais présenté comme complet s'il manque un prix. */
function CostView({ cost, hasPrice }: { cost: Cost; hasPrice: boolean }) {
  const missing = costMissing(cost)
  return (
    <section className="layout-cost" aria-label="Coût du meuble" data-testid="cost">
      <h3>Coût du meuble</h3>
      {!hasPrice ? (
        <p className="panel-note">Saisissez le prix de vos panneaux et de vos chants pour obtenir le coût du meuble.</p>
      ) : (
        <>
          <table className="data-table">
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
          <p className={`cost-total${cost.complete ? '' : ' partial'}`}>{costTotal(cost)}</p>
          {missing && <p className="layout-warning">{missing}</p>}
        </>
      )}
    </section>
  )
}

/** Le calepinage du meuble, recalculé à chaque modification. */
export function LayoutView() {
  const { project } = useEditor()
  const layout = useMemo(() => computeLayout(project), [project])
  const cost = useMemo(() => computeCost(project, layout), [project, layout])
  const isEmpty = project.pieces.length === 0

  function commitOption(field: 'kerf' | 'edgeMargin' | 'edgeOverhang') {
    return (text: string): CoreError | null => {
      const parsed = parseMm(text)
      return parsed.ok ? failure(changeLayoutOptions({ [field]: parsed.value })) : parsed.error
    }
  }

  return (
    <section className="layout-view" aria-label="Calepinage" data-testid="layout-view">
      <div className="layout-heading">
        <h2>Calepinage</h2>
        <button type="button" className="secondary" disabled={isEmpty} onClick={() => void exportCuttingPlan()}>
          Exporter le plan de coupe
        </button>
      </div>
      <p className="panel-note">{NO_MINIMUM_GUARANTEE}</p>

      <div className="layout-fields">
        <CommitField label="Trait de scie" unit="mm" value={formatMm(project.layout.kerf)} onCommit={commitOption('kerf')} />
        <CommitField label="Marge de bord" unit="mm" value={formatMm(project.layout.edgeMargin)} onCommit={commitOption('edgeMargin')} />
        <CommitField
          label="Surlongueur de chant"
          unit="mm"
          value={formatMm(project.layout.edgeOverhang)}
          onCommit={commitOption('edgeOverhang')}
        />
      </div>

      {isEmpty ? (
        <p className="empty-note">Ajoutez une pièce pour calculer le calepinage.</p>
      ) : (
        <>
          <CostView cost={cost} hasPrice={hasAnyPrice(project.layout.panels)} />
          {layout.groups.map((group) => (
            <GroupView key={`${group.thickness}|${group.material}`} group={group} margin={project.layout.edgeMargin} />
          ))}
        </>
      )}
    </section>
  )
}
