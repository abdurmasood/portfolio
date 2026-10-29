import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useVfs, useWindowManager, useWindowsState } from '@/components/rafeyos/state/logic/contexts'
import { HeaderBar } from '@/components/rafeyos/wm/HeaderBar'
import { Sym } from '@/components/rafeyos/ui/icons/symbols'
import { belowElement, useMenu } from '@/components/rafeyos/ui/menus/logic/useMenu'
import { useOpenPath } from '@/components/rafeyos/ui/popups/logic/useOpenPath'
import { pathCommands } from '@/components/rafeyos/ui/menus/logic/pathCommands'
import { reasonBody } from '@/components/rafeyos/ui/menus/logic/storageFailure'
import { useNotify } from '@/components/rafeyos/state/logic/useNotify'
import { WINDOW_PHASES } from '@/components/rafeyos/state/logic/windowsReducer'
import { editorMenuItems, folderLabel, recentDocumentItems } from './logic/editorMenus'
import { DOCUMENTS, placeLabel, saveChoice } from '@/components/rafeyos/core/vfs/documents'
import { FolderDropdown } from './FolderDropdown'
import { parentOf } from '@/components/rafeyos/core/vfs/paths'
import { APP } from '@/components/rafeyos/core/catalog/apps'
import { KEEPS_POPUP_PROPS } from '@/components/rafeyos/ui/logic/domHooks'

// The main menu sits at the end of the header, so it opens inwards (mockup offset)
const MAIN_MENU_SHIFT = 160
const DIRTY_MARK = '• '
const UNTITLED = 'Untitled'
const UNTITLED_FILE = `${UNTITLED}.txt`
const SAVE_ERROR = "Couldn't save this file."

/** "• bio.txt" once the text differs from the file. */
export const editorTitle = (name, dirty) => (dirty ? `${DIRTY_MARK}${name}` : name)

const useEditorMenus = (path, save) => {
  const { vfs } = useVfs()
  const windowManager = useWindowManager()
  const openPath = useOpenPath()
  const openMenu = useMenu()
  return useMemo(() => {
    const commands = path ? pathCommands({ vfs, windowManager, openPath }, path) : null
    const openDocument = (doc) => windowManager.openApp(APP.EDITOR, { path: doc })
    return {
      openRecent: (event) => openMenu(recentDocumentItems(vfs, openDocument), belowElement(event.currentTarget)),
      openMain: (event) => openMenu(
        editorMenuItems({
          showInFiles: commands?.showInFiles ?? null,
          openTerminal: commands?.openTerminal ?? null,
          save,
        }),
        belowElement(event.currentTarget, MAIN_MENU_SHIFT),
      ),
    }
  }, [vfs, windowManager, openPath, openMenu, path, save])
}

const EditorHeader = ({ title, subtitle, menus, onNew }) => (
  <HeaderBar
    title={title}
    subtitle={subtitle}
    start={
      <>
        <button type="button" className="flat" style={{ fontWeight: 700 }} onClick={menus.openRecent}>
          Open <Sym name="down" />
        </button>
        <button type="button" className="flat" aria-label="New tab" onClick={onNew}>
          <Sym name="plus" />
        </button>
      </>
    }
    end={
      <button type="button" className="flat" aria-label="Main Menu" onClick={menus.openMain}>
        <Sym name="menu" />
      </button>
    }
  />
)

/** Opens with the name before the extension selected, so typing replaces "Untitled" but keeps ".txt". */
const NameField = ({ value, onChange, onEnter }) => {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const input = ref.current
    const dot = input.value.lastIndexOf('.')
    input.focus()
    input.setSelectionRange(0, dot > 0 ? dot : input.value.length)
  }, [])
  return (
    <label className="where">
      Name
      <input
        ref={ref}
        aria-label="File name"
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onEnter()
        }}
      />
    </label>
  )
}

const Prompt = ({ label, title, body, children }) => (
  <div className="modal" {...KEEPS_POPUP_PROPS}>
    <div className="dlg app" role="dialog" aria-modal="true" aria-label={label}>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {children}
    </div>
  </div>
)

const userPathsOf = (vfs) => Object.keys(vfs).filter((path) => vfs[path].user)

const blockedPathsOf = (vfs) => Object.keys(vfs).filter((path) => !vfs[path].user)

const openPathsOf = (windows, windowId) =>
  Object.values(windows.byId)
    .filter((win) => win.id !== windowId && win.phase !== WINDOW_PHASES.CLOSING && win.appId === APP.EDITOR && win.arg)
    .map((win) => win.arg)

/** A notepad for files the visitor creates. Shipped files open here, locked. */
export const EditorApp = ({ windowId, arg }) => {
  const { vfs, saveDocument } = useVfs()
  const windowManager = useWindowManager()
  const windows = useWindowsState()
  const notify = useNotify()
  const node = arg ? vfs[arg] : null
  const missing = Boolean(arg) && !node
  const editable = !missing && (!node || node.user === true) && !node?.trashedFrom
  const savedText = node?.text ?? ''
  const label = node?.name ?? (missing ? arg.slice(arg.lastIndexOf('/') + 1) : UNTITLED)
  const [text, setText] = useState(savedText)
  const [prompt, setPrompt] = useState(null)
  const dirty = editable && text !== savedText
  const dirtyRef = useRef(dirty)
  const afterCloseRef = useRef(null)
  dirtyRef.current = dirty

  const dismiss = () => {
    afterCloseRef.current = null
    setPrompt(null)
  }

  const finish = (thenClose) => {
    if (!thenClose) {
      dismiss()
      return
    }
    const next = afterCloseRef.current
    afterCloseRef.current = null
    windowManager.setCloseGuard(windowId, null)
    windowManager.close(windowId)
    next?.()
  }

  const applySave = (raw, { folder, thenClose = false, replacing = false } = {}) => {
    const choice = saveChoice({
      raw,
      folder,
      userPaths: userPathsOf(vfs),
      openPaths: openPathsOf(windows, windowId),
      blockedPaths: blockedPathsOf(vfs),
      currentPath: node?.user ? arg : null,
    })
    if (choice.type === 'invalid') {
      setPrompt({ type: 'name', draft: raw, folder, error: 'Choose a file name.', thenClose })
      return
    }
    if (choice.type === 'blocked') {
      setPrompt({ type: 'blocked', name: choice.name })
      return
    }
    if (choice.type === 'open') {
      setPrompt({ type: 'open', name: choice.name })
      return
    }
    if (choice.type === 'replace' && !replacing) {
      setPrompt({ type: 'replace', name: choice.name, folder: choice.folder, thenClose })
      return
    }
    const saved = saveDocument(choice.folder, choice.name, text)
    if (!saved.ok) {
      notify({ appId: APP.EDITOR, title: "Couldn't save", body: reasonBody(saved.reason) })
      setPrompt({ type: 'name', draft: raw, folder, error: saved.reason === 'taken' ? `Can't replace ${choice.name}.` : SAVE_ERROR, thenClose })
      return
    }
    if (arg !== saved.path) windowManager.setArg(windowId, saved.path)
    finish(thenClose)
  }

  const startSave = (thenClose) => {
    if (node?.user) applySave(node.name, { folder: parentOf(arg), thenClose })
    else setPrompt({ type: 'name', draft: UNTITLED_FILE, folder: DOCUMENTS, error: '', thenClose })
  }

  const save = editable && (!node || dirty) ? () => startSave(false) : null
  const menus = useEditorMenus(node ? arg : '', save)

  useEffect(() => windowManager.setTitle(windowId, label), [windowManager, windowId, label])
  useEffect(() => {
    windowManager.setCloseGuard(windowId, (next) => {
      if (!dirtyRef.current) return undefined
      afterCloseRef.current = next ?? null
      setPrompt({ type: 'close' })
      return false
    })
    return () => windowManager.setCloseGuard(windowId, null)
  }, [windowManager, windowId])

  return (
    <div className="editor-app">
      <EditorHeader
        title={editorTitle(label, dirty)}
        subtitle={node ? (node.trashedFrom ? 'Trash' : node.user ? folderLabel(arg) : 'Read Only') : missing ? folderLabel(arg) : null}
        menus={menus}
        onNew={() => windowManager.openApp(APP.EDITOR)}
      />
      <div className="editor pane">
        <textarea
          value={text}
          onChange={(event) => {
            if (editable) setText(event.target.value)
          }}
          readOnly={!editable}
          spellCheck={false}
          aria-label={label}
        />
      </div>
      {prompt?.type === 'name' && (
        <Prompt label="Save" title="Save">
          <NameField
            value={prompt.draft}
            onChange={(draft) => setPrompt({ ...prompt, draft, error: '' })}
            onEnter={() => applySave(prompt.draft, { folder: prompt.folder, thenClose: prompt.thenClose })}
          />
          <FolderDropdown folder={prompt.folder} onChoose={(folder) => setPrompt({ ...prompt, folder })} />
          {prompt.error && <p className="err">{prompt.error}</p>}
          <div className="acts">
            <button type="button" className="btn" onClick={dismiss}>Cancel</button>
            <button type="button" className="btn sugg" onClick={() => applySave(prompt.draft, { folder: prompt.folder, thenClose: prompt.thenClose })}>Save</button>
          </div>
        </Prompt>
      )}
      {prompt?.type === 'replace' && (
        <Prompt label="Replace file" title={`Replace ${prompt.name}?`} body={`A file named ${prompt.name} is already in ${placeLabel(prompt.folder)}.`}>
          <div className="acts">
            <button type="button" className="btn" onClick={dismiss}>Cancel</button>
            <button type="button" className="btn sugg" onClick={() => applySave(prompt.name, { folder: prompt.folder, thenClose: prompt.thenClose, replacing: true })}>Replace</button>
          </div>
        </Prompt>
      )}
      {prompt?.type === 'blocked' && (
        <Prompt label="Can't replace" title={`Can't replace ${prompt.name}`} body="That file came with rafeyOS.">
          <div className="acts">
            <button type="button" className="btn sugg" onClick={dismiss}>OK</button>
          </div>
        </Prompt>
      )}
      {prompt?.type === 'open' && (
        <Prompt label="Already open" title={`${prompt.name} is already open`} body="Close that window before saving over it.">
          <div className="acts">
            <button type="button" className="btn sugg" onClick={dismiss}>OK</button>
          </div>
        </Prompt>
      )}
      {prompt?.type === 'close' && (
        <Prompt label="Save changes" title="Save changes?" body={`Save changes to ${label} before closing?`}>
          <div className="acts">
            <button type="button" className="btn danger" onClick={() => finish(true)}>Discard</button>
            <button type="button" className="btn" onClick={dismiss}>Cancel</button>
            <button type="button" className="btn sugg" onClick={() => startSave(true)}>Save</button>
          </div>
        </Prompt>
      )}
    </div>
  )
}
