export type SortOrder = 'ASC' | 'DESC';

export interface ISortParams<TField extends string = string> {
  sortBy?: TField;
  sortOrder?: SortOrder;
}
