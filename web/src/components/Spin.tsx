const Spin = ({
  size = 18,
  className = '',
}: {
  size?: number
  className?: string
}) => {
  return (
    <div
      className={`rounded-full animate-spin ${className}`}
      style={{
        width: size,
        height: size,
        border: '2px solid transparent',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        backgroundImage:
          'conic-gradient(from 0deg, #4285F4, #87CEFA, #E0F0FF, #ffffff)',
        maskImage: 'radial-gradient(farthest-side, transparent 60%, black 61%)',
        WebkitMaskImage:
          'radial-gradient(farthest-side, transparent 60%, black 61%)',
      }}
    />
  )
}

export default Spin
