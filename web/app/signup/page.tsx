'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const signupSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (values: SignupFormValues) => {
    setFormError(null)
    try {
      await signup(values.username, values.email, values.password)
      router.push('/')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('Username or email already taken')
      } else {
        setFormError('Something went wrong')
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-6 text-ink">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight">
          Finance <span className="text-highlight">Tracker</span>
        </h1>
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Username"
              type="text"
              autoComplete="username"
              error={errors.username?.message}
              {...register('username')}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            {formError && (
              <p role="alert" className="text-sm text-expense">
                {formError}
              </p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="mt-2">
              Sign up
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-text">
          Already have an account?{' '}
          <Link href="/login" className="text-highlight underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
