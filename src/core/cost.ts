import type { Layout } from './layout'
import type { Project } from './model'
import type { Cents, Tenths } from './units'

/** Le coût du meuble : uniquement des entiers, en centimes, sans erreur d'arrondi cumulée. */

export interface CostItem {
  kind: 'panels' | 'edge'
  material: string
  thickness: Tenths
  /** Nombre de panneaux, ou centimètres de chant. */
  quantity: number
  /** Prix d'un panneau ou d'un mètre de chant ; `null` s'il n'est pas saisi. */
  unitPrice: Cents | null
  /** Montant arrondi au centime ; `null` sans prix. */
  amount: Cents | null
}

export interface Cost {
  items: CostItem[]
  /** Somme des montants connus. */
  total: Cents
  /** Vrai seulement si chaque achat a son prix. */
  complete: boolean
}

/** Centimètres × centimes par mètre, divisé par 100 : arrondi au plus proche, les demis vers le haut. */
function edgeAmount(centimeters: number, pricePerMeter: Cents): Cents {
  return Math.floor((centimeters * pricePerMeter + 50) / 100)
}

/** Les panneaux du calepinage à leur prix, puis le chant de chaque groupe à son métrage. */
export function computeCost(_project: Project, layout: Layout): Cost {
  const items: CostItem[] = []
  for (const group of layout.groups) {
    const base = { material: group.material, thickness: group.thickness }
    if (group.panelCount > 0) {
      const unitPrice = group.stock.panelPrice
      items.push({ kind: 'panels', ...base, quantity: group.panelCount, unitPrice, amount: unitPrice === null ? null : group.panelCount * unitPrice })
    }
    if (group.edgeLength > 0) {
      // Le métrage acheté est celui affiché : arrondi au centimètre supérieur.
      const centimeters = Math.ceil(group.edgeLength / 100)
      const unitPrice = group.stock.edgePrice
      items.push({ kind: 'edge', ...base, quantity: centimeters, unitPrice, amount: unitPrice === null ? null : edgeAmount(centimeters, unitPrice) })
    }
  }
  return {
    items,
    total: items.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    complete: items.every((item) => item.amount !== null)
  }
}
