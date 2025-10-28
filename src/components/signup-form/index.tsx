import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { type UserResponse } from "@/server/training-server"

export function SignupForm(props: {onSubmit?: (name: string) => void }) {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = Object.fromEntries(formData.entries());
    props.onSubmit&&props.onSubmit(value.name as string);
  }
  return (
    <form className={cn("flex flex-col gap-6")} onSubmit={onSubmit} >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">创建账户</h1>
          <p className="text-muted-foreground text-sm text-balance">
            在下方输入账户名来创建新账户来保存学习进度
          </p>
        </div>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="name">账户名</FieldLabel>
          </div>
          <Input name="name" required />
        </Field>
        <Field>
          <Button type="submit">创建并登陆</Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
