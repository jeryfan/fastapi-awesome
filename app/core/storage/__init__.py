import logging
from collections.abc import Callable, Generator
from typing import Literal, Union, overload


from app.core.storage.base_storage import BaseStorage
from app.core.storage.storage_type import StorageType
from app.config import settings

logger = logging.getLogger(__name__)


class Storage:
    def __init__(self):
        storage_factory = self.get_storage_factory(settings.STORAGE_TYPE)
        self.storage_runner = storage_factory()

    @staticmethod
    def get_storage_factory(storage_type: str = "opendal") -> Callable[[], BaseStorage]:
        match storage_type:
            case StorageType.OPENDAL:
                from app.core.storage.opendal_storage import OpenDALStorage

                return lambda: OpenDALStorage(
                    settings.OPENDAL_SCHEME, root=settings.OPENDAL_ROOT
                )
            case StorageType.LOCAL:
                from app.core.storage.opendal_storage import OpenDALStorage

                return lambda: OpenDALStorage(
                    scheme="fs", root=settings.STORAGE_LOCAL_PATH
                )

            case _:
                raise ValueError(f"unsupported storage type {storage_type}")

    def save(self, filename, data):
        self.storage_runner.save(filename, data)

    @overload
    def load(self, filename: str, /, *, stream: Literal[False] = False) -> bytes: ...

    @overload
    def load(self, filename: str, /, *, stream: Literal[True]) -> Generator: ...

    def load(
        self, filename: str, /, *, stream: bool = False
    ) -> Union[bytes, Generator]:
        if stream:
            return self.load_stream(filename)
        else:
            return self.load_once(filename)

    def load_once(self, filename: str) -> bytes:
        return self.storage_runner.load_once(filename)

    def load_stream(self, filename: str) -> Generator:
        return self.storage_runner.load_stream(filename)

    def download(self, filename, target_filepath):
        self.storage_runner.download(filename, target_filepath)

    def exists(self, filename):
        return self.storage_runner.exists(filename)

    def delete(self, filename):
        return self.storage_runner.delete(filename)

    def scan(
        self, path: str, files: bool = True, directories: bool = False
    ) -> list[str]:
        return self.storage_runner.scan(path, files=files, directories=directories)


storage = Storage()
