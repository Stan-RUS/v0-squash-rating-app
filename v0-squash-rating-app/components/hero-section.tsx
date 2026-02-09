import { Users, Swords } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export function HeroSection({
  totalPlayers,
  totalMatches,
}: {
  totalPlayers: number
  totalMatches: number
}) {
  return (
    <section className="relative overflow-hidden bg-foreground text-background">
      <div className="absolute inset-0 opacity-[0.06]">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full border-2 border-background" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full border-2 border-background" />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
          {/* Logo on the left */}
          <div className="flex-shrink-0">
            <Image
              src="/images/nsc-logo.png"
              alt="NSC - Национальный Сквош Центр"
              width={160}
              height={160}
              className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl"
              priority
            />
          </div>

          {/* Content on the right */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-5">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-balance">
              Клубный рейтинг NSC
            </h1>
            <p className="max-w-xl text-background/70 text-base sm:text-lg leading-relaxed">
              Рейтинг для игроков клуба. Записывайте матчи, отслеживайте
              прогресс и соревнуйтесь за первое место в таблице.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  Присоединиться
                </Button>
              </Link>
              <Link href="/rating">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-background/30 text-background hover:bg-background/10 bg-transparent"
                >
                  Рейтинг
                </Button>
              </Link>
            </div>
            <div className="mt-2 flex items-center gap-8 text-sm text-background/70">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  <span className="font-semibold text-background">
                    {totalPlayers}
                  </span>{" "}
                  игроков
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4" />
                <span>
                  <span className="font-semibold text-background">
                    {totalMatches}
                  </span>{" "}
                  матчей
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
