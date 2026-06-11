function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseClasses = 'rounded-md px-5 py-3 font-semibold transition'

  const variants = {
    primary: 'bg-violet-400 text-zinc-950 hover:bg-violet-300',
    secondary: 'border border-zinc-700 text-white hover:bg-zinc-900',
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
