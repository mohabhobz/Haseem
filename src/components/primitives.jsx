import { Ico } from './icons.jsx'
/* عناصر أساسية — كلها ≥ 44px منطقة لمس (إصلاح D1) */

export function Button({ label, variant = 'ghost', size, icon, onClick, style, className = '', children, ...rest }) {
  return (
    <button
      data-component="Button" data-variant={variant}
      className={`btn btn--${variant}${size ? ` btn--${size}` : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick} style={style} {...rest}>
      {icon && <span className="ico">{icon}</span>}
      {label ?? children}
    </button>
  )
}

export function IconButton({ icon, title, onClick, className = '', ...rest }) {
  return (
    <button data-component="IconButton" className={`iconbtn ${className}`}
      title={title} aria-label={title} onClick={onClick} {...rest}>{icon}</button>
  )
}

export function Checkbox({ checked = false, onChange }) {
  return (
    <span data-component="Checkbox" className="cbwrap"
      onClick={(e) => { e.stopPropagation(); onChange && onChange(!checked) }}>
      <span className={`cb${checked ? ' on' : ''}`} />
    </span>
  )
}

export function Field({ label, type = 'text', placeholder, hint, error, extra, ...rest }) {
  return (
    <div data-component="Field" className={`field${error ? ' field--error' : ''}`}>
      <div className="field__row">
        <label className="field__label">{label}</label>
        {extra}
      </div>
      <input className="field__input" type={type} placeholder={placeholder} {...rest} />
      {hint && <div className="field__hint">{hint}</div>}
      {error && <div className="field__error"><span>!</span>{error}</div>}
    </div>
  )
}

export function SearchField({ placeholder = 'ابحث…', width }) {
  return (
    <div data-component="SearchField" className="search" style={width ? { minWidth: width } : undefined}>
      <Ico.search size={17} />
      <input placeholder={placeholder} />
      <kbd>⌘K</kbd>
    </div>
  )
}
