"""Compatibility entrypoint to the new training script."""

try:
    from .train_model import main
except ImportError:  # pragma: no cover
    from train_model import main  # type: ignore


if __name__ == "__main__":
    main()
