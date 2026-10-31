import { Fragment } from 'react'
import { SKILLS } from '@/lib/descriptions'

// The separator's no-break space keeps a wrapped line from starting with "·"
const SEPARATOR = ' · '

/** `skills` in both terminals: a dim category column, each tool a link, wrapping under its own column. */
export const SkillRows = () => (
  <div className="skill-rows">
    {SKILLS.map(([category, tools]) => (
      <Fragment key={category}>
        <span className="dim">{category}</span>
        <span>
          {tools.map(([name, url], index) => (
            <Fragment key={name}>
              {index > 0 && SEPARATOR}
              <a className="skill" href={url} target="_blank" rel="noopener noreferrer">{name}</a>
            </Fragment>
          ))}
        </span>
      </Fragment>
    ))}
  </div>
)
