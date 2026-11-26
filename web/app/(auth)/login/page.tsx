import { LoginForm } from './LoginForm'

// LoginForm is a client component gated by the (auth) guard, so this page
// segment is intentionally dropped from the server prerender and can't be
// validated for instant navigation. Opt it out explicitly.
export const instant = false

export default function LoginPage() {
  return <LoginForm />
}
