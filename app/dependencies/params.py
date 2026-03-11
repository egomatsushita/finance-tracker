from typing import Annotated

from fastapi import Depends

from schemas.params import FilterParams

FilterParamsDep = Annotated[FilterParams, Depends()]
