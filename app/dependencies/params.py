from typing import Annotated

from fastapi import Depends

from errors.params import InvalidFilterError
from schemas.params import FilterParams, TransactionFilterParams

FilterParamsDep = Annotated[FilterParams, Depends()]


def get_transaction_filter_params(
    params: Annotated[TransactionFilterParams, Depends()],
) -> TransactionFilterParams:
    if (
        params.transaction_date_from is not None
        and params.transaction_date_to is not None
        and params.transaction_date_from > params.transaction_date_to
    ):
        raise InvalidFilterError(
            "transaction_date_from must be before transaction_date_to"
        )
    return params


TransactionFilterParamsDep = Annotated[
    TransactionFilterParams, Depends(get_transaction_filter_params)
]
