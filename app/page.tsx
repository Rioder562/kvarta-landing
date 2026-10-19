import Header from "../components/header";
import RoastTicket from "../components/roast-ticket";
import CoffeeList from "../components/coffee-list";
import SubscriptionCard from "../components/subscription-card";
import HowItWorks from "../components/how-it-works";
import About from "../components/about";
import OrderForm from "../components/order-form";
import SiteFooter from "../components/site-footer";
import StickyCta from "../components/sticky-cta";
import { workshop } from "../data/coffees";

export default function Home() {
  return (
    <main className="page">
      <Header />
      <div className="container">
        <div className="strip-line mono">
          малое обжарочно в {workshop.city}е · с {workshop.since} года
        </div>
        <RoastTicket />
        <CoffeeList />
        <SubscriptionCard />
        <HowItWorks />
        <About />
        <OrderForm />
      </div>
      <SiteFooter />
      <StickyCta />
    </main>
  );
}
