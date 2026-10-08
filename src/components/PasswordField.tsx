import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function PasswordField({ className = '', ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span className={`password-field${className ? ` ${className}` : ''}`}>
      <input {...props} type={visible ? 'text' : 'password'} />
      <button className="password-field-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible((isVisible) => !isVisible)} disabled={props.disabled}>
        {visible ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
      </button>
    </span>
  )
}
