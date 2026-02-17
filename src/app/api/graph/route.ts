import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = db.getGraphData(user.id);
  
  // Build graph nodes and edges
  const nodes: any[] = [];
  const edges: any[] = [];

  // Add folder nodes
  for (const folder of data.folders) {
    nodes.push({ id: `folder-${folder.id}`, label: folder.name, type: 'folder', itemId: folder.id });
    if (folder.parent_id) {
      edges.push({ source: `folder-${folder.parent_id}`, target: `folder-${folder.id}`, type: 'contains' });
    }
  }

  // Add file nodes
  for (const file of data.files) {
    const ext = file.original_name.split('.').pop()?.toLowerCase() || '';
    const category = getCategory(file.mime_type);
    nodes.push({ id: `file-${file.id}`, label: file.original_name, type: 'file', category, mimeType: file.mime_type, size: file.size, itemId: file.id });
    if (file.folder_id) {
      edges.push({ source: `folder-${file.folder_id}`, target: `file-${file.id}`, type: 'contains' });
    }

    // Create "related" edges between files of the same type in the same folder
    for (const other of data.files) {
      if (other.id !== file.id && other.folder_id === file.folder_id && getCategory(other.mime_type) === category) {
        const edgeId = [file.id, other.id].sort().join('-');
        if (!edges.find(e => e.id === edgeId)) {
          edges.push({ id: edgeId, source: `file-${file.id}`, target: `file-${other.id}`, type: 'related' });
        }
      }
    }
  }

  // Add share connections
  for (const share of data.shares) {
    const nodeId = share.item_type === 'file' ? `file-${share.item_id}` : `folder-${share.item_id}`;
    const userNodeId = `user-${share.shared_with_name}`;
    if (!nodes.find(n => n.id === userNodeId)) {
      nodes.push({ id: userNodeId, label: share.shared_with_name, type: 'user' });
    }
    edges.push({ source: nodeId, target: userNodeId, type: 'shared' });
  }

  // Add mock tag nodes for demo
  const tagMap: Record<string, string[]> = {};
  for (const file of data.files) {
    const cat = getCategory(file.mime_type);
    if (!tagMap[cat]) tagMap[cat] = [];
    tagMap[cat].push(`file-${file.id}`);
  }
  for (const [tag, fileIds] of Object.entries(tagMap)) {
    if (fileIds.length > 1) {
      const tagNodeId = `tag-${tag}`;
      nodes.push({ id: tagNodeId, label: tag, type: 'tag' });
      for (const fid of fileIds) {
        edges.push({ source: fid, target: tagNodeId, type: 'tagged' });
      }
    }
  }

  return NextResponse.json({ nodes, edges });
}

function getCategory(mime: string): string {
  if (mime.startsWith('image/')) return 'Images';
  if (mime.startsWith('video/')) return 'Videos';
  if (mime.startsWith('audio/')) return 'Audio';
  if (mime === 'application/pdf') return 'Documents';
  if (mime.includes('text') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript')) return 'Code';
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('tar')) return 'Archives';
  return 'Other';
}
