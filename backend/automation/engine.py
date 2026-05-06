from apscheduler.schedulers.background import BackgroundScheduler

class AutomationEngine:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.triggers: dict[str, callable] = {}

    def start(self): self.scheduler.start()
    def stop(self): self.scheduler.shutdown(wait=False)

    def schedule_daily(self, hour: int, minute: int, fn):
        self.scheduler.add_job(fn, "cron", hour=hour, minute=minute)

    def register_trigger(self, event: str, fn):
        self.triggers[event] = fn

    def emit_event(self, event: str):
        if event in self.triggers: self.triggers[event]()
