// Site types for e-commerce system
export interface SiteItem {
  id: string;
  code: string;
  name: string;
  type: 'STORE' | 'WAREHOUSE' | 'MARKDOWN';
  isMarkdown: boolean;
  isActive: boolean;
}
