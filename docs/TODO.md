# SideNotes - TODO / Roadmap

## Plugin System
- [ ] Design plugin API (Plugin base class, lifecycle hooks: onload/unload)
- [ ] Plugin loader (load JS from `.sidenotes/plugins/` directory)
- [ ] Core API surface: `app.vault` (file CRUD), `app.workspace` (views, editor access), `app.metadataCache` (links, tags, frontmatter)
- [ ] UI hooks: register commands, settings tabs, custom views, ribbon icons
- [ ] Plugin manifest format (manifest.json with id, version, deps)
- [ ] Plugin settings storage (per-plugin data.json)
- [ ] Obsidian API compatibility shim (subset for graph/metadata plugins)
- [ ] Plugin marketplace / community directory

## Graph View Enhancements
- [ ] Support graph-related Obsidian plugins (Graph Analysis, Juggl, Breadcrumbs)
- [ ] Local graph view (show connections for current note only)
- [ ] Graph filters (by folder, tag, link depth)
- [ ] Graph groups/clusters visualization
- [ ] Custom node colors by folder/tag

## Voice / Dictation
- [ ] Streaming transcription (show words as you speak, not after stop)
- [ ] Voice commands ("new note", "add heading", "insert link to...")
- [ ] Speaker diarization for meeting notes
- [ ] Auto-detect language (no manual language setting needed)
- [ ] Global hotkey (works even when app is not focused)

## Editor
- [ ] Slash command for callouts/admonitions
- [ ] Drag-and-drop block reordering
- [ ] Multi-cursor editing
- [ ] Vim keybindings (optional)
- [ ] Transclusion (embed content from other notes inline)

## Platform
- [ ] iOS/Android companion app (view + quick capture)
- [ ] Sync (encrypted, self-hostable)
- [ ] Web clipper browser extension
- [ ] Share individual notes as public links
