import { useMemo } from 'react'
import { computeLayout, groupLabel, type LayoutGroup } from '../../core/layout'
import type { CoreError, Result } from '../../core/result'
import { formatMm, parseMm } from '../../core/units'
import { groupSummary, groupTitle, NO_MINIMUM_GUARANTEE, panelTitle, unplacedText } from '../layoutText'
import { changeLayoutOptions, changePanelStock, exportCuttingPlan, useEditor } from '../store'
import { CommitField } from './CommitField'
import { LayoutDrawing } from './LayoutDrawing'

function failure(result: Result<unknown>): CoreError | null {
  return result.ok ? null : result.error
}

function GroupView({ group, margin }: { group: LayoutGroup; margin: number }) {
  const summary = groupSummary(group)

  function commitStock(field: 'length' | 'width') {
    return (text: string): CoreError | null => {
      const parsed = parseMm(text)
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
      {group.stock.isDefault && (
        <p className="panel-note">Panneau proposé par défaut : remplacez ses cotes par celles de votre fournisseur.</p>
      )}

      <p className="layout-summary" data-testid="layout-summary">
        <strong>{summary.panels}</strong> · {summary.usage} · {summary.pieces}
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
            />
          </figure>
        )
      })}
    </section>
  )
}

/** Le calepinage du meuble, recalculé à chaque modification. */
export function LayoutView() {
  const { project } = useEditor()
  const layout = useMemo(() => computeLayout(project), [project])
  const isEmpty = project.pieces.length === 0

  function commitOption(field: 'kerf' | 'edgeMargin') {
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
      </div>

      {isEmpty ? (
        <p className="empty-note">Ajoutez une pièce pour calculer le calepinage.</p>
      ) : (
        layout.groups.map((group) => (
          <GroupView key={`${group.thickness}|${group.material}`} group={group} margin={project.layout.edgeMargin} />
        ))
      )}
    </section>
  )
}
