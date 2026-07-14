from sqlalchemy import Integer, String, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date

from database.lmcpafm_models import Base


class Disposal(Base):
    __tablename__ = "disposal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"), nullable=False)
    experiment_id: Mapped[int] = mapped_column(ForeignKey("experiment.id"), nullable=True)

    date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str] = mapped_column(String, nullable=False)          # sacrifice / euthanasia / death
    reason: Mapped[str] = mapped_column(String, nullable=False)          # scientific reason or cause
    remarks: Mapped[str] = mapped_column(String, nullable=False)

    animal: Mapped["Animal"] = relationship()
    experiment: Mapped["Experiment"] = relationship()
