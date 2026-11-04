'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    try {
      await login(values.username, values.password)
      router.push('/')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFormError('Incorrect username or password')
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
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            {formError && <p className="text-sm text-expense">{formError}</p>}
            <Button type="submit" isLoading={isSubmitting} className="mt-2">
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
