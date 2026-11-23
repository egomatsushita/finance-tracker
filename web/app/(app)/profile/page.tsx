'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { useUpdateProfile } from '@/lib/queries'
import type { ProfileUpdatePayload } from '@/lib/types'

const profileFormSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((values) => !values.password || values.password.length >= 8, {
    message: 'Password must be at least 8 characters',
    path: ['password'],
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()
  const updateProfile = useUpdateProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { username: user?.username ?? '', email: user?.email ?? '', password: '', confirmPassword: '' },
  })

  if (!user) return null

  function startEditing() {
    reset({ username: user!.username, email: user!.email, password: '', confirmPassword: '' })
    setFormError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setFormError(null)
  }

  const onSubmit = async (values: ProfileFormValues) => {
    setFormError(null)
    const payload: ProfileUpdatePayload = {}
    if (values.username !== user!.username) payload.username = values.username
    if (values.email !== user!.email) payload.email = values.email
    if (values.password) payload.password = values.password

    if (Object.keys(payload).length === 0) {
      setIsEditing(false)
      return
    }

    try {
      await updateProfile.mutateAsync({ id: user!.id, payload })
      await refreshUser()
      showToast('Profile updated')
      setIsEditing(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('Username or email already taken')
      } else {
        setFormError('Something went wrong')
      }
    }
  }

  if (!isEditing) {
    return (
      <div className="mx-auto max-w-sm p-4">
        <Card>
          <h1 className="mb-4 text-lg font-semibold text-ink">Profile</h1>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-muted-text">Username</dt>
              <dd className="text-ink">{user.username}</dd>
            </div>
            <div>
              <dt className="text-muted-text">Email</dt>
              <dd className="text-ink">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-text">Status</dt>
              <dd className="text-ink">{user.is_active ? 'Active' : 'Inactive'}</dd>
            </div>
            <div>
              <dt className="text-muted-text">Member since</dt>
              <dd className="text-ink">{formatDate(user.created_at)}</dd>
            </div>
          </dl>
          <Button onClick={startEditing} className="mt-6">
            Edit
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm p-4">
      <Card>
        <h1 className="mb-4 text-lg font-semibold text-ink">Edit profile</h1>
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
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {formError && (
            <p role="alert" className="text-sm text-expense">
              {formError}
            </p>
          )}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={cancelEditing}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
