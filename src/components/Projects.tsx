import { useEffect, useState } from 'react'
import { ChevronDown, FolderOpen, Pencil, Plus } from 'lucide-react'
import { useEditorContext } from './EditorContext'

export function ProjectButton() {
  const { state, actions } = useEditorContext()
  const current = state.projects.find(project => project.id === state.activeProjectId)
  return <button type="button" className="project-switcher" hidden={Boolean(state.action)} disabled={!state.ready || state.projectsBusy || state.fileBusy}
    aria-label={`Projetos: ${current?.name ?? 'Abrir projetos'}`} aria-haspopup="dialog" aria-controls="projects-dialog" onClick={() => actions?.requestProjects()}>
    <FolderOpen aria-hidden="true" /><span>{current?.name ?? 'Projetos'}</span><ChevronDown aria-hidden="true" />
  </button>
}
export function ProjectsContent() {
  const { state, actions } = useEditorContext()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [renamed, setRenamed] = useState('')
  useEffect(() => { if (state.projectsDialogOpen) { setName(''); setEditing(null) } }, [state.projectsDialogOpen])
  return <>
    <p id="projects-description">Cada projeto tem suas próprias áreas e pontos. O projeto atual é salvo antes de trocar.</p>
    {state.projectsError && <p role="alert" className="project-error">{state.projectsError}</p>}
    <form className="project-create" onSubmit={event => { event.preventDefault(); if (name.trim()) void actions?.createProject(name) }}>
      <label htmlFor="new-project-name">Novo projeto</label><div><input id="new-project-name" value={name} maxLength={60} required autoComplete="off" placeholder="Nome do projeto" onChange={event => setName(event.target.value)} />
      <button type="submit" disabled={state.projectsBusy || !name.trim()}><Plus aria-hidden="true" />Criar</button></div>
    </form>
    <ul className="project-list">{state.projects.map(project => <li key={project.id}>
      {editing === project.id ? <form className="project-rename" onSubmit={event => { event.preventDefault(); void actions?.renameProject(project.id, renamed).then(() => setEditing(null)) }}>
        <label className="visually-hidden" htmlFor={`project-name-${project.id}`}>Nome do projeto</label><input id={`project-name-${project.id}`} value={renamed} maxLength={60} required onChange={event => setRenamed(event.target.value)} />
        <button type="submit" disabled={state.projectsBusy || !renamed.trim()}>Salvar</button><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button>
      </form> : <>
        <button type="button" className="project-open secondary" disabled={state.projectsBusy} aria-pressed={project.id === state.activeProjectId} onClick={() => void actions?.openProject(project.id)}>
          <strong>{project.name}</strong><small>{project.areaCount} área(s) · {project.pointCount} ponto(s){project.id === state.activeProjectId ? ' · Atual' : ''}</small>
        </button>
        <button type="button" className="secondary icon-button" aria-label={`Renomear projeto ${project.name}`} disabled={state.projectsBusy} onClick={() => { setEditing(project.id); setRenamed(project.name) }}><Pencil aria-hidden="true" /></button>
      </>}
    </li>)}</ul>
    {state.projectsBusy && <p role="status">Salvando e abrindo projeto…</p>}
  </>
}
