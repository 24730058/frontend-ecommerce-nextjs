import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-black bg-home-img bg-cover bg-center">
      <main className="flex flex-col justify-center text-center max-w-5xl mx-auto h-dvh">
        <div className="flex flex-col gap-6 p-12 rounded-xl bg-black/90 w-4/5 sm:max-w-96 mx-auto text-white sm:text-2xl">
          <h1 className="text-4xl font-bold">Welcome to Our Store</h1>
          <address>
            123 Main Street
            <br />
            Anytown, USA 12345
          </address>
          <p>Open Daily: 9am to 5pm</p>
          <p>Số điện thoại: 555-555-5555</p>
          <Link href="/home" className="mx-auto">
            <Button className="bg-white text-black hover:bg-gray-200">
              Trang chủ
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
