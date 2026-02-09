import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Trophy, Mail } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto flex items-center gap-2 text-primary mb-2">
            <Trophy className="h-6 w-6" />
            <span className="font-semibold text-lg">Squash Rating</span>
          </div>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Проверьте почту</CardTitle>
          <CardDescription>
            Мы отправили письмо с ссылкой для подтверждения на ваш email.
            Перейдите по ссылке для активации аккаунта.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full bg-transparent">
              Перейти к входу
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
