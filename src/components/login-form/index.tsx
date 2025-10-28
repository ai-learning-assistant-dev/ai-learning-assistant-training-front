import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type UserResponse } from "@/server/training-server"

export function LoginForm(props: {userList?: UserResponse[], onSubmit?: (user_id: string) => void }) {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = Object.fromEntries(formData.entries());
    props.onSubmit&&props.onSubmit(value.user_id as string);
  }
  return (
    <form className={cn("flex flex-col gap-6")} onSubmit={onSubmit} >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">登陆账户</h1>
          <p className="text-muted-foreground text-sm text-balance">
            在下方选择账户名来从上次进度继续学习
          </p>
        </div>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="user_id">账户名</FieldLabel>
          </div>
          <Select name="user_id" required>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择一个账户" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {props.userList?.map((user)=>{
                  return <SelectItem key={user.user_id} value={user.user_id}>{user.name}</SelectItem>
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Button type="submit">登陆</Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
