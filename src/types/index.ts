export interface User {
  id: string; email: string; display_name: string; avatar_url: string | null; is_admin: number;
}
export interface FileItem {
  id: string; name: string; original_name: string; mime_type: string; size: number;
  share_token: string | null; share_expires_at: string | null; share_password: string | null;
  created_at: string; folder_id: string | null;
  starred: number; deleted_at: string | null;
}
export interface FolderItem {
  id: string; name: string; created_at: string; parent_id: string | null; deleted_at: string | null;
}
export interface Breadcrumb { id: string; name: string; }
export interface StorageInfo { used: number; fileCount: number; }
export interface ShareItem {
  id: string; item_id: string; item_type: string; item_name: string;
  mime_type: string; size: number; owner_name: string; permission: string;
}
export interface FolderTreeNode { id: string; name: string; children: FolderTreeNode[]; }
export type SidebarTab = 'files' | 'shared' | 'starred' | 'trash';
export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortDir = 'asc' | 'desc';
export type FilterType = 'all' | 'images' | 'video' | 'audio' | 'documents' | 'archives' | 'code';
