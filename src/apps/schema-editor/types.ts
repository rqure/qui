import type { EntityType } from '@/core/data/types'

export interface SchemaTreeNode {
  id: EntityType
  name: string
  parentId: EntityType | null
  children: SchemaTreeNode[]
  directFieldCount: number
  totalFieldCount: number
}
