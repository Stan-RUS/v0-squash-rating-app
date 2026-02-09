import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Trophy, AlertTriangle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto flex items-center gap-2 text-primary mb-2">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Ошибка</CardTitle>
          <CardDescription>
            Произошла ошибка при авторизации. Попробуйте ещё раз.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Link href="/auth/login">
            <Button className="w-full">Перейти к входу</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full bg-transparent">
              На главную
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
